'use client'

import type {OrganisationNetworkResponse} from '@heritagemonitor/shared'
import type {PickingInfo} from '@deck.gl/core'
import Box from '@mui/material/Box'
import {useEffect, useMemo, useRef} from 'react'
import {
    ArcNetworkLayer,
    DeckMapCanvas,
    MapControls,
    NETWORK_MAP_CAMERA,
    useDeckMapViewState,
    useVisualizationColors,
    type ArcNetworkLink,
    type ArcNetworkNode,
} from '@/common/deckgl'
import {Text} from '@/common/text'
import type {MapView} from '@/common/url'
import {arcLinks, arcNodes, centreOf, findNode, formatShared} from './networkAdapter'

export interface NetworkMapTabProps {
    network: OrganisationNetworkResponse
    loading: boolean
    /** The selected organisation (a partner, or the centre itself). */
    selectedId: string | null
    /** An arc: select that partner (its pair opens in the detail tab). */
    onSelectPartner: (id: string) => void
    /** An icon: make that organisation the new centre. */
    onCentre: (id: string) => void
    /** The camera a copied link asked for, or null to frame the centre. */
    initialView: MapView | null
    onViewChange: (view: MapView) => void
}

/** Europe, where the corpus is concentrated — only until the centre is known. */
const DEFAULT_VIEW_STATE = {longitude: 10, latitude: 48, zoom: 3.5, ...NETWORK_MAP_CAMERA}
/** Zoom when the map frames a centre. */
const CENTRE_ZOOM = 4

function isNode(object: unknown): object is ArcNetworkNode {
    return typeof object === 'object' && object !== null && 'linkCount' in object
}

/**
 * The map tab: the centre in the middle, an arc to each partner weighted by
 * shared projects, the selected arc drawn on top (ArcNetworkLayer). An arc
 * selects a partner; an icon re-centres the network on that organisation —
 * the two things the old app's map did.
 *
 * The camera is uncontrolled (see useDeckMapViewState) and lives in the URL
 * as `view`; a NEW centre flies the camera to it, a copied link's `view`
 * wins on first load.
 */
export function NetworkMapTab({network, loading, selectedId, onSelectPartner, onCentre, initialView, onViewChange}: NetworkMapTabProps) {
    const colors = useVisualizationColors()
    const viewState = useDeckMapViewState(initialView ? {...DEFAULT_VIEW_STATE, ...initialView} : DEFAULT_VIEW_STATE)

    const centre = centreOf(network)
    const links = useMemo(() => arcLinks(network), [network])
    const nodes = useMemo(() => arcNodes(network), [network])

    // Frame the centre once per centre. On the very first one, a camera from
    // the URL is what the sender saw: keep it.
    const framed = useRef<string | null>(null)
    const keptUrlView = useRef(initialView !== null)
    const {flyTo} = viewState
    useEffect(() => {
        if (!centre || centre.lat === null || centre.lng === null || framed.current === centre.id) return
        const first = framed.current === null
        framed.current = centre.id
        if (first && keptUrlView.current) return
        flyTo({latitude: centre.lat, longitude: centre.lng, zoom: CENTRE_ZOOM})
    }, [centre, flyTo])

    const layers = useMemo(
        () => [
            new ArcNetworkLayer({
                id: 'organisation-network',
                data: links,
                nodes,
                primaryColorHex: colors.primary,
                secondaryColorHex: colors.secondary,
                highlightColorHex: colors.highlight,
                selectedLinkId: selectedId,
                onClick: (info: PickingInfo) => {
                    const object = info.object as ArcNetworkLink | ArcNetworkNode | undefined
                    if (!object?.id) return
                    if (isNode(object)) {
                        if (object.id !== centre?.id) onCentre(object.id)
                    } else {
                        onSelectPartner(object.id)
                    }
                },
            }),
        ],
        [links, nodes, colors, selectedId, onSelectPartner, onCentre, centre?.id],
    )

    const tooltip = (info: PickingInfo): string | null => {
        const object = info.object as ArcNetworkLink | ArcNetworkNode | undefined
        if (!object?.id) return null
        const node = findNode(network, object.id)
        if (!node) return null
        if (isNode(object)) return node.id === centre?.id ? `${node.name}\ncentre of the network` : `${node.name}\n${formatShared(node.w)} — click to centre on it`
        return `${centre?.name ?? ''} ↔ ${node.name}\n${formatShared(node.w)}`
    }

    return (
        <Box sx={{flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column'}}>
            <Box sx={{px: 2, py: 1, flexShrink: 0}}>
                <Text variant="subtitle1" truncate sx={{fontWeight: 600}}>
                    {centre?.name ?? 'Collaboration network'}
                </Text>
                <Text variant="caption" truncate color="text.secondary" sx={{display: 'block'}}>
                    Arcs go to partners that shared a project; click an arc for the pair, an icon to centre on it.
                </Text>
            </Box>
            <Box sx={{position: 'relative', flex: '1 1 0', minHeight: 0}}>
                {/* Absolute so the canvas's 100% height resolves against a definite size, not the flex item. */}
                <Box sx={{position: 'absolute', inset: 0}}>
                    <DeckMapCanvas
                        id="organisation-network-map"
                        layers={layers}
                        initialViewState={viewState.initialViewState}
                        commandedViewState={viewState.commandedViewState}
                        onViewStateChange={(next) => {
                            viewState.onViewStateChange(next)
                            onViewChange({latitude: next.latitude, longitude: next.longitude, zoom: next.zoom})
                        }}
                        isGlobe={viewState.isGlobe}
                        getTooltip={tooltip}
                        loading={loading}
                        error={null}
                    />
                </Box>
                <Box sx={{position: 'absolute', bottom: 16, right: 16}}>
                    <MapControls
                        onReset={viewState.reset}
                        onZoomIn={() => viewState.zoomBy(1)}
                        onZoomOut={() => viewState.zoomBy(-1)}
                        onGeolocate={viewState.geolocate}
                        isGlobe={viewState.isGlobe}
                        onToggleGlobe={viewState.toggleGlobe}
                    />
                </Box>
            </Box>
        </Box>
    )
}
