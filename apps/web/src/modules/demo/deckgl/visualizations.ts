import type {Layer, PickingInfo} from '@deck.gl/core'
import type {CollaborationEdge} from '@heritagemonitor/shared'
import {ArcCollaborationLayer} from './arcCollaborationLayer'
import {createInstitutionColumnLayer} from './institutionColumnLayer'

// The registry the demo page's dropdown reads from. Every entry reshapes
// the *same* CollaborationEdge[] client-side (see institutionPoints.ts) —
// no visualization here needed a different OpenSearch document shape, which
// is what made both worth building on one dataset instead of one.
//
// A third view (HexagonLayer density) was tried and dropped: @deck.gl/aggregation-layers
// 9.4.0's CPU hexbin aggregator computes a garbage bin position for a few of
// the highest-weight bins at this continental zoom/extent (verified via a
// debug hover — a bin whose member points were all in Paris reported a
// position near Antarctica). Not a props-tuning issue (tried gpuAggregation:
// false and larger radii); a real upstream bug not worth chasing for this demo.

export interface VisualizationThemeColors {
    primary: string
    primaryLight: string
    secondary: string
}

export interface VisualizationHandlers {
    onHover?: (info: PickingInfo) => void
    onClick?: (info: PickingInfo) => void
}

export interface Visualization {
    id: string
    label: string
    description: string
    createLayers: (data: CollaborationEdge[], colors: VisualizationThemeColors, handlers: VisualizationHandlers) => Layer[]
}

export const VISUALIZATIONS: Visualization[] = [
    {
        id: 'arcs',
        label: 'Arcs + institutions',
        description: 'Great-circle arcs between collaborating institutions, weighted by shared projects',
        createLayers: (data, colors, {onHover, onClick}) => [
            new ArcCollaborationLayer({
                id: 'collaboration-arcs',
                data,
                primaryColorHex: colors.primary,
                secondaryColorHex: colors.secondary,
                onHover,
                onClick,
            }),
        ],
    },
    {
        id: 'columns',
        label: 'Institution columns',
        description: '3D bar per institution, height by total shared projects',
        createLayers: (data, colors, {onHover, onClick}) => [
            createInstitutionColumnLayer({
                id: 'collaboration-columns',
                data,
                lowColorHex: colors.primaryLight,
                highColorHex: colors.secondary,
                onHover,
                onClick,
            }),
        ],
    },
]

export const DEFAULT_VISUALIZATION_ID = VISUALIZATIONS[0].id
