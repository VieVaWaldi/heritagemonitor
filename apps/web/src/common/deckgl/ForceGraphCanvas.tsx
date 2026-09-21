'use client'

import {OrthographicView, type PickingInfo} from '@deck.gl/core'
import {LineLayer, ScatterplotLayer, TextLayer} from '@deck.gl/layers'
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
    /** A ring around the node — e.g. the strongest hinge organisations. */
    ring?: boolean
    /** Text drawn beside the node. */
    label?: string
    /** Drawn faded: not part of what is selected. */
    dimmed?: boolean
}

export interface ForceGraphEdge {
    id: string
    source: [number, number]
    target: [number, number]
    /** Drives the line width, relative to the strongest edge. */
    weight: number
    /** `bridge` edges (between groups) are drawn heavier and in the highlight colour; the rest recede. */
    emphasis?: 'bridge'
    dimmed?: boolean
}

/** A translucent disc behind a group of nodes. */
export interface ForceGraphBlob {
    id: string
    x: number
    y: number
    /** In graph units, not pixels: it scales with the zoom like the layout does. */
    radius: number
    color: [number, number, number]
    selected?: boolean
}

export interface ForceGraphCanvasProps {
    id: string
    nodes: ForceGraphNode[]
    edges: ForceGraphEdge[]
    /** The view that shows the whole graph — see fitOrthographicView. */
    initialView: {target: [number, number, number]; zoom: number}
    selectedEdgeId: string | null
    highlightColorHex: string
    blobs?: ForceGraphBlob[]
    onClickBlob?: (id: string) => void
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
const BRIDGE_EDGE_WIDTH = 4
const RING_EXTRA_PIXELS = 4

export function ForceGraphCanvas({
    id,
    nodes,
    edges,
    initialView,
    selectedEdgeId,
    highlightColorHex,
    blobs = [],
    onClickBlob,
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

        const labelled = nodes.filter((node) => node.label)

        return [
            new ScatterplotLayer<ForceGraphBlob>({
                id: `${id}-blobs`,
                data: blobs,
                getPosition: (d) => [d.x, d.y],
                getRadius: (d) => d.radius,
                radiusUnits: 'common',
                getFillColor: (d) => [...d.color, d.selected ? 70 : 32],
                stroked: true,
                getLineColor: (d) => [...d.color, d.selected ? 220 : 90],
                getLineWidth: (d) => (d.selected ? 3 : 1),
                lineWidthUnits: 'pixels',
                pickable: true,
                onClick: (info) => info.object && onClickBlob?.(info.object.id),
                updateTriggers: {getFillColor: blobs, getLineColor: blobs, getLineWidth: blobs},
            }),
            new LineLayer<ForceGraphEdge>({
                id: `${id}-edges`,
                data: edges,
                getSourcePosition: (d) => d.source,
                getTargetPosition: (d) => d.target,
                getColor: (d) => [...(d.emphasis === 'bridge' ? highlight : edgeRgb), d.dimmed ? DIMMED_ALPHA / 2 : d.emphasis === 'bridge' ? 230 : alpha],
                getWidth: (d) => (d.emphasis === 'bridge' ? BRIDGE_EDGE_WIDTH : MIN_EDGE_WIDTH) + (d.weight / maxWeight) * (MAX_EDGE_WIDTH - MIN_EDGE_WIDTH),
                widthUnits: 'pixels',
                pickable: true,
                onClick: (info) => info.object && onClickEdge?.(info.object.id),
                updateTriggers: {getColor: [alpha, isDark, edges, highlightColorHex], getWidth: [edges]},
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
                getFillColor: (d) => [...d.color, d.dimmed ? 90 : 235],
                stroked: true,
                getLineColor: isDark ? [20, 20, 20, 200] : [255, 255, 255, 220],
                lineWidthMinPixels: 1,
                pickable: true,
                onClick: (info) => info.object && onClickNode?.(info.object.id),
                updateTriggers: {getFillColor: nodes, getLineColor: isDark},
            }),
            new ScatterplotLayer<ForceGraphNode>({
                id: `${id}-rings`,
                data: nodes.filter((node) => node.ring),
                getPosition: (d) => [d.x, d.y],
                getRadius: (d) => d.radius + RING_EXTRA_PIXELS,
                radiusUnits: 'pixels',
                filled: false,
                stroked: true,
                getLineColor: [...highlight, 255],
                lineWidthMinPixels: 2,
                pickable: false,
                updateTriggers: {getRadius: nodes},
            }),
            new TextLayer<ForceGraphNode>({
                id: `${id}-labels`,
                data: labelled,
                getPosition: (d) => [d.x, d.y],
                getText: (d) => d.label ?? '',
                getSize: 12,
                sizeUnits: 'pixels',
                getColor: isDark ? [235, 235, 235, 255] : [30, 30, 30, 255],
                getPixelOffset: (d) => [0, -(d.radius + 12)],
                background: true,
                getBackgroundColor: isDark ? [20, 20, 20, 190] : [255, 255, 255, 200],
                backgroundPadding: [3, 1],
                pickable: false,
                updateTriggers: {getColor: isDark, getBackgroundColor: isDark},
            }),
        ]
    }, [id, nodes, edges, blobs, selectedEdgeId, highlightColorHex, isDark, onClickBlob, onClickEdge, onClickNode])

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
