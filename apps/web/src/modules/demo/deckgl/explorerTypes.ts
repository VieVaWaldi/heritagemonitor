import type {CollaborationEdge} from '@heritagemonitor/shared'
import type {VisualizationModel} from '@/common/deckgl'

// What a demo visualization is. The generic halves — ExplorerItem,
// MapSelection, VisualizationThemeColors, VisualizationModel — moved to
// @/common/deckgl when the funding page started using them; what is left here
// is the one piece that is genuinely about this demo: a visualization is
// something that reshapes the SAME CollaborationEdge[] into a model.

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
