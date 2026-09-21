'use client'

import type {FundingMapResponse} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import type {PickingInfo} from '@deck.gl/core'
import {useEffect, useMemo, useState} from 'react'
import {
    createHexFundingLayer,
    DeckMapCanvas,
    formatFunding,
    HEX_REBIN_DEBOUNCE_MS,
    hexBinsFromOrganisations,
    hexResolutionForZoom,
    snapHexZoom,
    MapControls,
    useDeckMapViewState,
    useVisualizationColors,
    type HexBin,
} from '@/common/deckgl'
import {Text} from '@/common/text'
import type {MapView} from '@/common/url'
import {mapOrganisationsFrom} from './fundingAdapter'
import {formatGeolocatedShare} from './fundingFormat'

export interface FundingMapTabProps {
    data: FundingMapResponse
    loading: boolean
    selectedId: string | null
    onSelect: (id: string) => void
    /** The camera a copied link asked for, or null for the default. */
    initialView: MapView | null
    onViewChange: (view: MapView) => void
}

/**
 * Default camera: continental Europe, where the corpus is concentrated, tilted
 * so hexagon height reads as height. Only used when the URL carries no `view`.
 */
const DEFAULT_VIEW_STATE = {longitude: 8, latitude: 48, zoom: 4, pitch: 30}

function hexTooltip(info: PickingInfo): string | null {
    const bin = info.object as HexBin | undefined
    if (!bin) return null
    const names = bin.organisations.slice(0, 3).map((organisation) => organisation.name)
    const more = bin.organisations.length - names.length
    return [`${formatFunding(bin.funding)} across ${bin.organisations.length}`, names.join(', ') + (more > 0 ? ` +${more} more` : '')].join(
        '\n',
    )
}

/**
 * The funding map: one H3 hexagon per area (finer as you zoom in), its height and colour the
 * summed funding of the organisations inside.
 *
 * Hexagons only — no column layer. At this scale (up to 500 points, most of
 * them European) individual columns overlap into an unreadable thicket, while
 * a hex bin answers the question the page actually asks: where did the money
 * go, not which pin is where.
 */
export function FundingMapTab({data, loading, selectedId, onSelect, initialView, onViewChange}: FundingMapTabProps) {
    const colors = useVisualizationColors()
    const viewState = useDeckMapViewState(initialView ? {...DEFAULT_VIEW_STATE, ...initialView} : DEFAULT_VIEW_STATE)

    // The hexes' width and height follow the camera (see hexZoomFactor), so
    // the layer needs the zoom. Snapped to half a level (as the original does) and only
    // written when that changes: the raw value fires on every animation frame, and
    // re-rendering the layer 60 times a second would rebuild its geometry.
    const [zoom, setZoom] = useState(initialView?.zoom ?? DEFAULT_VIEW_STATE.zoom)

    // Finer hexes the closer you zoom. The resolution is derived from the
    // (already rounded) zoom, and only adopted after the zoom has settled: a
    // pinch or wheel gesture passes through several resolutions and re-binning
    // for each would rebuild the geometry mid-gesture. Setting the same value
    // is a no-op, so panning at a steady zoom never re-bins.
    const [resolution, setResolution] = useState(() => hexResolutionForZoom(zoom))
    useEffect(() => {
        const timer = setTimeout(() => setResolution(hexResolutionForZoom(zoom)), HEX_REBIN_DEBOUNCE_MS)
        return () => clearTimeout(timer)
    }, [zoom])

    // Binned once per payload and resolution, not per render: re-binning would
    // rebuild the layer's geometry on every pan.
    const {bins, binByOrganisationId} = useMemo(() => {
        const organisations = mapOrganisationsFrom(data.orgs)
        const computed = hexBinsFromOrganisations(organisations, resolution)
        const index = new Map<string, HexBin>()
        for (const bin of computed) for (const organisation of bin.organisations) index.set(organisation.id, bin)
        return {bins: computed, binByOrganisationId: index}
    }, [data.orgs, resolution])

    const layers = useMemo(
        () => [
            createHexFundingLayer({
                id: 'funding-hexes',
                data: bins,
                zoom,
                isGlobe: viewState.isGlobe,
                highlightColorHex: colors.highlight,
                selectedHex: selectedId ? (binByOrganisationId.get(selectedId)?.hex ?? null) : null,
                // A hexagon holds several organisations; select its best-funded
                // one, which is the first (bins keep the input's order).
                onClick: (info) => {
                    if (info.object) onSelect(info.object.organisations[0].id)
                },
            }),
        ],
        [bins, binByOrganisationId, colors, selectedId, onSelect, zoom, viewState.isGlobe],
    )

    return (
        <Box sx={{flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column'}}>
            <Box sx={{px: 2, py: 1, flexShrink: 0}}>
                <Text variant="body2" truncate color="text.secondary">
                    {formatGeolocatedShare(data.orgs.length, data.ranked)}
                </Text>
            </Box>

            <Box sx={{position: 'relative', flex: '1 1 0', minHeight: 0}}>
                {/* Absolute so the canvas's 100% height resolves against a definite size, not the flex item. */}
                <Box sx={{position: 'absolute', inset: 0}}>
                    <DeckMapCanvas
                        id="funding-map"
                        layers={layers}
                        initialViewState={viewState.initialViewState}
                        commandedViewState={viewState.commandedViewState}
                        onViewStateChange={(next) => {
                            viewState.onViewStateChange(next)
                            onViewChange({latitude: next.latitude, longitude: next.longitude, zoom: next.zoom})
                            const snapped = snapHexZoom(next.zoom)
                            setZoom((current) => (current === snapped ? current : snapped))
                        }}
                        isGlobe={viewState.isGlobe}
                        getTooltip={hexTooltip}
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
