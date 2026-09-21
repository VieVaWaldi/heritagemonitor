import type {Layer} from '@deck.gl/core'
import type {CollaborationEdge} from '@heritagemonitor/shared'
import type {ReactNode} from 'react'

export interface VisualizationThemeColors {
    primary: string
    primaryLight: string
    secondary: string
    highlight: string
}

// What the paginated list and the detail tab need from any visualization's
// items, whatever their underlying type (an edge, an organisation, ...).
// Each visualization closes over its own typed data, so nothing here is generic.
export interface ExplorerItem {
    id: string
    title: string
    subtitle: string
    renderDetail: (select: (id: string) => void) => ReactNode
}

export interface MapSelection {
    selectedId: string | null
    onSelect: (id: string) => void
}

export interface VisualizationModel {
    items: ExplorerItem[]
    createLayers: (colors: VisualizationThemeColors, selection: MapSelection) => Layer[]
}

export interface Visualization {
    id: string
    /** Dropdown label */
    label: string
    /** Small heading above the map */
    title: string
    description: string
    /** Plural noun for the list header, e.g. "collaborations" */
    itemNoun: string
    /** Shown in the detail tab while nothing is selected */
    emptyDetailHint: string
    // Derives everything from the raw edges once; the page memoizes the result.
    prepare: (edges: CollaborationEdge[]) => VisualizationModel
}
