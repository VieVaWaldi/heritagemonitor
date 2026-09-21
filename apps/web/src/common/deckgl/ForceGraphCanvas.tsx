'use client'

import {OrthographicView, type PickingInfo} from '@deck.gl/core'
import {LineLayer, ScatterplotLayer} from '@deck.gl/layers'
import DeckGL from '@deck.gl/react'
import Box from '@mui/material/Box'
import {useTheme} from '@mui/material/styles'
import {useMemo} from 'react'
import {Text} from '@/common/text'
import {hexToRgb} from './colors'
import {MapStatusOverlay} from './MapStatusOverlay'

// The force graph's canvas: a deck.gl OrthographicView (flat, no map) with the
// edges as lines and the nodes as circles. Everything below the layout — what
// a node's colour means, which edge is selected — comes in as plain props;
// nothing here knows about organisations.

export interface ForceGraphNode {
    id: string
    x: number
    y: number
    /** Radius in pixels. */
    radius: number
    color: [number, number, number]
}

export interface ForceGraphEdge {
    id: string
    source: [number, number]
    target: [number, number]
    /** Drives the line width, relative to the strongest edge. */
    weight: number
}

export interface ForceGraphCanvasProps {
    id: string
    nodes: ForceGraphNode[]
    edges: ForceGraphEdge[]
    /** The view that shows the whole graph — see fitOrthographicView. */
    initialView: {target: [number, number, number]; zoom: number}
    selectedEdgeId: string | null
    highlightColorHex: string
    onClickEdge?: (id: string) => void
    onClickNode?: (id: string) => void
    getTooltip?: (info: PickingInfo) => string | null
    loading?: boolean
    emptyMessage?: string
}

const VIEW = new OrthographicView({id: 'force-graph'})
const MIN_EDGE_WIDTH = 1
const MAX_EDGE_WIDTH = 5
const SELECTED_EDGE_WIDTH = 6
const DIMMED_ALPHA = 60

export function ForceGraphCanvas({
    id,
    nodes,
    edges,
    initialView,
    selectedEdgeId,
    highlightColorHex,
    onClickEdge,
    onClickNode,
    getTooltip,
    loading,
    emptyMessage = 'Nothing to show for this search.',
}: ForceGraphCanvasProps) {
    const theme = useTheme()
    const isDark = theme.palette.mode === 'dark'

    const layers = useMemo(() => {
        if (nodes.length === 0) return []
        const maxWeight = Math.max(1, ...edges.map((edge) => edge.weight))
        const selected = selectedEdgeId ? edges.find((edge) => edge.id === selectedEdgeId) : undefined
        const highlight = hexToRgb(highlightColorHex)
        const edgeRgb: [number, number, number] = isDark ? [170, 180, 190] : [90, 100, 110]
        const alpha = selected ? DIMMED_ALPHA : 170

        return [
            new LineLayer<ForceGraphEdge>({
                id: `${id}-edges`,
                data: edges,
                getSourcePosition: (d) => d.source,
                getTargetPosition: (d) => d.target,
                getColor: [...edgeRgb, alpha],
                getWidth: (d) => MIN_EDGE_WIDTH + (d.weight / maxWeight) * (MAX_EDGE_WIDTH - MIN_EDGE_WIDTH),
                widthUnits: 'pixels',
                pickable: true,
                onClick: (info) => info.object && onClickEdge?.(info.object.id),
                updateTriggers: {getColor: [alpha, isDark]},
            }),
            // Its own layer so the selected edge draws above the others.
            new LineLayer<ForceGraphEdge>({
                id: `${id}-selected-edge`,
                data: selected ? [selected] : [],
                getSourcePosition: (d) => d.source,
                getTargetPosition: (d) => d.target,
                getColor: [...highlight, 255],
                getWidth: SELECTED_EDGE_WIDTH,
                widthUnits: 'pixels',
                pickable: false,
            }),
            new ScatterplotLayer<ForceGraphNode>({
                id: `${id}-nodes`,
                data: nodes,
                getPosition: (d) => [d.x, d.y],
                getRadius: (d) => d.radius,
                radiusUnits: 'pixels',
                getFillColor: (d) => [...d.color, 230],
                stroked: true,
                getLineColor: isDark ? [20, 20, 20, 200] : [255, 255, 255, 220],
                lineWidthMinPixels: 1,
                pickable: true,
                onClick: (info) => info.object && onClickNode?.(info.object.id),
                updateTriggers: {getFillColor: nodes, getLineColor: isDark},
            }),
        ]
    }, [id, nodes, edges, selectedEdgeId, highlightColorHex, isDark, onClickEdge, onClickNode])

    return (
        <Box sx={{position: 'relative', width: '100%', height: '100%'}}>
            <DeckGL
                id={`deck-${id}`}
                views={VIEW}
                initialViewState={initialView}
                controller
                layers={layers}
                getTooltip={getTooltip}
                getCursor={({isDragging, isHovering}) => (isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab')}
            />
            {!loading && nodes.length === 0 && (
                <Box sx={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2}}>
                    <Text variant="body2" color="text.secondary" sx={{textAlign: 'center'}}>
                        {emptyMessage}
                    </Text>
                </Box>
            )}
            <MapStatusOverlay loading={loading} error={null} />
        </Box>
    )
}
