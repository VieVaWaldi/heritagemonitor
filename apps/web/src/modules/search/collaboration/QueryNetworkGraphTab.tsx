'use client'

import type {QueryNetworkResponse} from '@heritagemonitor/shared'
import type {PickingInfo} from '@deck.gl/core'
import Box from '@mui/material/Box'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import {useMemo} from 'react'
import {
    ArcNetworkLayer,
    communityColor,
    DeckMapCanvas,
    detectCommunities,
    fitOrthographicView,
    ForceGraphCanvas,
    layoutForceGraph,
    MapControls,
    NETWORK_MAP_CAMERA,
    nodeRadius,
    useDeckMapViewState,
    useVisualizationColors,
    type ArcNetworkLink,
    type ArcNetworkNode,
    type ForceGraphEdge,
    type ForceGraphNode,
} from '@/common/deckgl'
import {Text} from '@/common/text'
import type {MapView} from '@/common/url'
import {formatShared} from './networkAdapter'
import {basisNote, edgeArcLinks, edgeArcNodes, type QueryEdge} from './queryNetworkAdapter'

export type QueryNetworkLayer = 'network' | 'arcs'
export const QUERY_NETWORK_LAYERS = ['network', 'arcs'] as const

export interface QueryNetworkGraphTabProps {
    network: QueryNetworkResponse
    edges: QueryEdge[]
    loading: boolean
    layer: QueryNetworkLayer
    onLayerChange: (layer: QueryNetworkLayer) => void
    selectedEdgeId: string | null
    onSelectEdge: (id: string) => void
    initialView: MapView | null
    onViewChange: (view: MapView) => void
}

/** Europe, where the corpus is concentrated. */
const DEFAULT_VIEW_STATE = {longitude: 10, latitude: 48, zoom: 3.5, ...NETWORK_MAP_CAMERA}

function isNode(object: unknown): object is ArcNetworkNode {
    return typeof object === 'object' && object !== null && 'linkCount' in object
}

/**
 * The graph tab: the force graph (organisations laid out by who works with
 * whom, coloured by community) or, with `layer=arcs`, the same edges as arcs on
 * a map — for the organisations that have coordinates. The note under the
 * title says what the picture is based on, because it is a window on the top
 * of the ranking and not the whole corpus.
 */
export function QueryNetworkGraphTab({network, edges, loading, layer, onLayerChange, selectedEdgeId, onSelectEdge, initialView, onViewChange}: QueryNetworkGraphTabProps) {
    return (
        <Box sx={{flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column'}}>
            <Box sx={{px: 2, py: 1, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1.5}}>
                <Box sx={{flex: '1 1 auto', minWidth: 0}}>
                    <Text variant="caption" color="text.secondary" sx={{display: 'block'}}>
                        {network.edges.length > 0 ? basisNote(network.meta) : ''} {network.meta.capped ? `Showing the ${network.edges.length} strongest of ${network.meta.edgesFound.toLocaleString('en-US')} collaborations.` : ''}
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
            <Box sx={{position: 'relative', flex: '1 1 0', minHeight: 0}}>
                <Box sx={{position: 'absolute', inset: 0}}>
                    {layer === 'network' ? (
                        <ForceView network={network} edges={edges} loading={loading} selectedEdgeId={selectedEdgeId} onSelectEdge={onSelectEdge} />
                    ) : (
                        <ArcsView network={network} edges={edges} loading={loading} selectedEdgeId={selectedEdgeId} onSelectEdge={onSelectEdge} initialView={initialView} onViewChange={onViewChange} />
                    )}
                </Box>
            </Box>
        </Box>
    )
}

interface ViewProps {
    network: QueryNetworkResponse
    edges: QueryEdge[]
    loading: boolean
    selectedEdgeId: string | null
    onSelectEdge: (id: string) => void
}

function ForceView({network, edges, loading, selectedEdgeId, onSelectEdge}: ViewProps) {
    const colors = useVisualizationColors()

    // Laid out once per network: 300 ticks over up to ~600 nodes is tens of
    // milliseconds, and nothing else (selection, hover) may redo it.
    const graph = useMemo(() => {
        const layout = layoutForceGraph(
            network.nodes.map((node) => ({id: node.id})),
            edges.map((edge) => ({source: edge.a.id, target: edge.b.id})),
        )
        const communities = detectCommunities(edges.map((edge) => ({a: edge.a.id, b: edge.b.id, weight: edge.w})))
        const nodes: ForceGraphNode[] = network.nodes.map((node) => {
            const position = layout.positions.get(node.id) ?? {x: 0, y: 0}
            return {id: node.id, x: position.x, y: position.y, radius: nodeRadius(layout.degree.get(node.id) ?? 0), color: communityColor(communities.get(node.id) ?? -1)}
        })
        const graphEdges: ForceGraphEdge[] = edges.map((edge) => {
            const a = layout.positions.get(edge.a.id) ?? {x: 0, y: 0}
            const b = layout.positions.get(edge.b.id) ?? {x: 0, y: 0}
            return {id: edge.id, source: [a.x, a.y], target: [b.x, b.y], weight: edge.w}
        })
        return {nodes, edges: graphEdges, view: fitOrthographicView(layout.bounds)}
    }, [network.nodes, edges])

    const nodeById = useMemo(() => new Map(network.nodes.map((node) => [node.id, node])), [network.nodes])
    const edgeById = useMemo(() => new Map(edges.map((edge) => [edge.id, edge])), [edges])

    const tooltip = (info: PickingInfo): string | null => {
        const object = info.object as {id?: string} | undefined
        if (!object?.id) return null
        const edge = edgeById.get(object.id)
        if (edge) return `${edge.a.name} ↔ ${edge.b.name}\n${formatShared(edge.w)}`
        const node = nodeById.get(object.id)
        return node ? `${node.name}\n${node.countryCode ?? ''}` : null
    }

    return (
        <ForceGraphCanvas
            id="query-network-graph"
            nodes={graph.nodes}
            edges={graph.edges}
            initialView={graph.view}
            selectedEdgeId={selectedEdgeId}
            highlightColorHex={colors.highlight}
            onClickEdge={onSelectEdge}
            getTooltip={tooltip}
            loading={loading}
            emptyMessage="No collaborations found for this search. Try a broader query or fewer filters."
        />
    )
}

function ArcsView({network, edges, loading, selectedEdgeId, onSelectEdge, initialView, onViewChange}: ViewProps & {initialView: MapView | null; onViewChange: (view: MapView) => void}) {
    const colors = useVisualizationColors()
    const viewState = useDeckMapViewState(initialView ? {...DEFAULT_VIEW_STATE, ...initialView} : DEFAULT_VIEW_STATE)

    const links: ArcNetworkLink[] = useMemo(() => edgeArcLinks(edges), [edges])
    const nodes: ArcNetworkNode[] = useMemo(() => edgeArcNodes(network, edges), [network, edges])
    const edgeById = useMemo(() => new Map(edges.map((edge) => [edge.id, edge])), [edges])
    const nodeById = useMemo(() => new Map(network.nodes.map((node) => [node.id, node])), [network.nodes])

    const layers = useMemo(
        () => [
            new ArcNetworkLayer({
                id: 'query-network-arcs',
                data: links,
                nodes,
                primaryColorHex: colors.primary,
                secondaryColorHex: colors.secondary,
                highlightColorHex: colors.highlight,
                selectedLinkId: selectedEdgeId,
                onClick: (info: PickingInfo) => {
                    const object = info.object as ArcNetworkLink | ArcNetworkNode | undefined
                    if (object?.id && !isNode(object)) onSelectEdge(object.id)
                },
            }),
        ],
        [links, nodes, colors, selectedEdgeId, onSelectEdge],
    )

    const tooltip = (info: PickingInfo): string | null => {
        const object = info.object as ArcNetworkLink | ArcNetworkNode | undefined
        if (!object?.id) return null
        if (isNode(object)) return nodeById.get(object.id)?.name ?? null
        const edge = edgeById.get(object.id)
        return edge ? `${edge.a.name} ↔ ${edge.b.name}\n${formatShared(edge.w)}` : null
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
