'use client'

import type {QueryNetworkResponse} from '@heritagemonitor/shared'
import type {PickingInfo} from '@deck.gl/core'
import Box from '@mui/material/Box'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import {useCallback, useEffect, useMemo, useRef} from 'react'
import {
    ArcNetworkLayer,
    DeckMapCanvas,
    fitOrthographicView,
    fitGeoBounds,
    ForceGraphCanvas,
    layoutForceGraph,
    MapControls,
    NETWORK_MAP_CAMERA,
    useDeckMapViewState,
    useVisualizationColors,
    type ArcNetworkLink,
    type ArcNetworkNode,
} from '@/common/deckgl'
import {Text} from '@/common/text'
import type {MapView} from '@/common/url'
import {ClusterLegend} from './ClusterLegend'
import {clusterArcs, layoutInputs, selectedClusterPoints, styleForceGraph} from './clusterGraph'
import type {ClusterModel} from './clusters'
import {basisNote} from './queryNetworkAdapter'

export type QueryNetworkLayer = 'network' | 'arcs'
export const QUERY_NETWORK_LAYERS = ['network', 'arcs'] as const

export interface QueryNetworkGraphTabProps {
    network: QueryNetworkResponse
    model: ClusterModel
    titles: ReadonlyMap<string, {title: string}>
    loading: boolean
    layer: QueryNetworkLayer
    onLayerChange: (layer: QueryNetworkLayer) => void
    selectedClusterId: string | null
    /** A node, a blob, an arc or a legend chip: always a CLUSTER, never a single organisation. */
    onSelectCluster: (id: string) => void
    initialView: MapView | null
    onViewChange: (view: MapView) => void
}

/** Europe, where the corpus is concentrated. */
const DEFAULT_VIEW_STATE = {longitude: 10, latitude: 48, zoom: 3.5, ...NETWORK_MAP_CAMERA}

/**
 * The graph tab: the collaboration graph with nodes coloured by cluster, a
 * translucent blob behind each cluster, the hinge organisations ringed and
 * labelled, and the links BETWEEN clusters drawn heavier than the ones inside
 * them. Or, with `layer=arcs`, the same edges as arcs on a map (organisations
 * with coordinates only). Hovering names an organisation; clicking selects the
 * cluster it belongs to.
 */
export function QueryNetworkGraphTab({network, model, titles, loading, layer, onLayerChange, selectedClusterId, onSelectCluster, initialView, onViewChange}: QueryNetworkGraphTabProps) {
    return (
        <Box sx={{flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column'}}>
            <Box sx={{px: 2, py: 1, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1.5}}>
                <Box sx={{flex: '1 1 auto', minWidth: 0}}>
                    <Text variant="caption" color="text.secondary" sx={{display: 'block'}}>
                        {network.edges.length > 0 ? basisNote(network.meta) : ''}{' '}
                        {network.meta.capped ? `Showing the ${network.edges.length} strongest of ${network.meta.edgesFound.toLocaleString('en-US')} collaborations.` : ''}
                    </Text>
                </Box>
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={layer}
                    onChange={(_event, next: QueryNetworkLayer | null) => next && onLayerChange(next)}
                    aria-label="Graph layout"
                >
                    <ToggleButton value="network">Network</ToggleButton>
                    <ToggleButton value="arcs">Map</ToggleButton>
                </ToggleButtonGroup>
            </Box>
            {/*<ClusterLegend clusters={model.clusters} titles={titles} selectedId={selectedClusterId} onSelect={onSelectCluster} />*/}
            <Box sx={{position: 'relative', flex: '1 1 0', minHeight: 0}}>
                <Box sx={{position: 'absolute', inset: 0}}>
                    {layer === 'network' ? (
                        <ForceView network={network} model={model} loading={loading} selectedClusterId={selectedClusterId} onSelectCluster={onSelectCluster} />
                    ) : (
                        <ArcsView network={network} model={model} loading={loading} selectedClusterId={selectedClusterId} onSelectCluster={onSelectCluster} initialView={initialView} onViewChange={onViewChange} />
                    )}
                </Box>
            </Box>
        </Box>
    )
}

interface ViewProps {
    network: QueryNetworkResponse
    model: ClusterModel
    loading: boolean
    selectedClusterId: string | null
    onSelectCluster: (id: string) => void
}

function ForceView({network, model, loading, selectedClusterId, onSelectCluster}: ViewProps) {
    const colors = useVisualizationColors()

    // Laid out once per network: 300 ticks over up to ~600 nodes is tens of
    // milliseconds, and nothing else (selection, hover) may redo it.
    const layout = useMemo(() => {
        const inputs = layoutInputs(network, model)
        return layoutForceGraph(inputs.nodes, inputs.links)
    }, [network, model])
    const view = useMemo(() => fitOrthographicView(layout.bounds), [layout])
    const styled = useMemo(() => styleForceGraph({network, model, layout, selectedCluster: selectedClusterId}), [network, model, layout, selectedClusterId])

    const nodeByIndexId = useMemo(() => new Map(network.nodes.map((node, index) => [node.id, index])), [network.nodes])
    const clusterOfNodeId = (id: string): string | undefined => {
        const index = nodeByIndexId.get(id)
        return index === undefined ? undefined : model.clusterOfNode.get(index)
    }

    const tooltip = (info: PickingInfo): string | null => {
        const object = info.object as {id?: string; radius?: number} | undefined
        if (!object?.id) return null
        // A node: its name. A blob or an edge: nothing to name.
        const index = nodeByIndexId.get(object.id)
        if (index === undefined) return null
        const node = network.nodes[index]
        return [node.name, node.countryCode].filter(Boolean).join(' · ')
    }

    return (
        <ForceGraphCanvas
            id="query-network-graph"
            nodes={styled.nodes}
            edges={styled.edges}
            blobs={styled.blobs}
            initialView={view}
            selectedEdgeId={null}
            highlightColorHex={colors.highlight}
            onClickNode={(id) => {
                const cluster = clusterOfNodeId(id)
                if (cluster) onSelectCluster(cluster)
            }}
            onClickBlob={onSelectCluster}
            // An edge inside a cluster selects that cluster; a bridge between two selects neither.
            onClickEdge={(id) => {
                const [a, b] = id.split(':')
                const ca = clusterOfNodeId(a)
                if (ca && ca === clusterOfNodeId(b)) onSelectCluster(ca)
            }}
            getTooltip={tooltip}
            loading={loading}
            emptyMessage="No collaborations found for this search. Try a broader query or fewer filters."
        />
    )
}

/** A camera move within this long of the user's own pan is theirs: a selection that follows it does not yank the map away. */
const USER_PAN_GRACE_MS = 1500
/** How long our own fly-to keeps emitting view changes that must not be mistaken for the user's. */
const FLY_DURATION_MS = 1200

function ArcsView({network, model, loading, selectedClusterId, onSelectCluster, initialView, onViewChange}: ViewProps & {initialView: MapView | null; onViewChange: (view: MapView) => void}) {
    const colors = useVisualizationColors()
    const viewState = useDeckMapViewState(initialView ? {...DEFAULT_VIEW_STATE, ...initialView} : DEFAULT_VIEW_STATE)

    // The SELECTED cluster is emphasised and the others dimmed, by the same
    // rule as the graph (clusterSelection). The selection is a dependency of
    // the arcs, so a new selection redraws them — it used to be ignored here.
    const arcs = useMemo(() => clusterArcs(network, model, selectedClusterId), [network, model, selectedClusterId])
    const nodeById = useMemo(() => new Map(network.nodes.map((node, index) => [node.id, index])), [network.nodes])

    // Fit the camera to the selected cluster when the SELECTION changes — not
    // on first load with a copied `view` (the sender's camera wins), not right
    // after the user panned it themselves, and never for a cluster with no
    // located organisation (the panel says so; the camera stays).
    const points = useMemo(() => selectedClusterPoints(network, model, selectedClusterId), [network, model, selectedClusterId])
    const fitted = useRef<string | null | undefined>(undefined)
    const keptUrlView = useRef(initialView !== null)
    const lastUserMove = useRef(0)
    const flyingUntil = useRef(0)
    const {flyTo} = viewState
    useEffect(() => {
        if (selectedClusterId === null || points.length === 0 || fitted.current === selectedClusterId) return
        const first = fitted.current === undefined
        fitted.current = selectedClusterId
        if (first && keptUrlView.current) return
        // The very first fit is never skipped: the map may report its initial
        // camera as a change, which is not the user panning.
        if (!first && Date.now() - lastUserMove.current < USER_PAN_GRACE_MS) return
        const fit = fitGeoBounds(points)
        if (!fit) return
        flyingUntil.current = Date.now() + FLY_DURATION_MS
        flyTo(fit)
    }, [selectedClusterId, points, flyTo])

    const clusterOfNodeId = useCallback(
        (id: string): string | undefined => {
            const index = nodeById.get(id)
            return index === undefined ? undefined : model.clusterOfNode.get(index)
        },
        [nodeById, model],
    )

    const layers = useMemo(
        () => [
            new ArcNetworkLayer({
                id: 'query-network-arcs',
                data: arcs.links,
                nodes: arcs.nodes,
                primaryColorHex: colors.primary,
                secondaryColorHex: colors.secondary,
                highlightColorHex: colors.highlight,
                selectedLinkId: null,
                onClick: (info: PickingInfo) => {
                    const object = info.object as ArcNetworkLink | ArcNetworkNode | undefined
                    if (!object?.id) return
                    // An icon: its cluster. An arc inside a cluster: that cluster.
                    const isIcon = 'linkCount' in object
                    const cluster = isIcon ? clusterOfNodeId(object.id) : clusterOfNodeId(object.id.split(':')[0])
                    if (cluster && (isIcon || cluster === clusterOfNodeId(object.id.split(':')[1]))) onSelectCluster(cluster)
                },
            }),
        ],
        [arcs, colors, onSelectCluster, clusterOfNodeId],
    )

    const tooltip = (info: PickingInfo): string | null => {
        const object = info.object as ArcNetworkLink | ArcNetworkNode | undefined
        if (!object?.id) return null
        if ('linkCount' in object) {
            const index = nodeById.get(object.id)
            return index === undefined ? null : network.nodes[index].name
        }
        const [a, b] = object.id.split(':')
        const na = nodeById.get(a)
        const nb = nodeById.get(b)
        return na !== undefined && nb !== undefined ? `${network.nodes[na].name} ↔ ${network.nodes[nb].name}` : null
    }

    return (
        <>
            <DeckMapCanvas
                id="query-network-map"
                layers={layers}
                initialViewState={viewState.initialViewState}
                commandedViewState={viewState.commandedViewState}
                onViewStateChange={(next) => {
                    viewState.onViewStateChange(next)
                    // Only the user's own gestures count as "just panned": our
                    // fly-to emits changes too, and those are not theirs.
                    if (Date.now() > flyingUntil.current) lastUserMove.current = Date.now()
                    onViewChange({latitude: next.latitude, longitude: next.longitude, zoom: next.zoom})
                }}
                isGlobe={viewState.isGlobe}
                getTooltip={tooltip}
                loading={loading}
                error={null}
            />
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
        </>
    )
}
