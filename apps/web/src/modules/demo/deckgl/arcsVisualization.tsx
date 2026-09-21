import type {CollaborationEdge} from '@heritagemonitor/shared'
import {ArcCollaborationLayer, collaborationEdgeId} from './arcCollaborationLayer'
import {CollaborationDetail} from './detail/CollaborationDetail'
import type {ExplorerItem, Visualization} from './explorerTypes'
import {formatCount} from './format'

function toItem(edge: CollaborationEdge): ExplorerItem {
    const countries = [edge.institution_country, edge.collaborator_country].filter(Boolean).join(' – ')
    return {
        id: collaborationEdgeId(edge),
        title: `${edge.institution_name} ↔ ${edge.collaborator_name}`,
        subtitle: [formatCount(edge.project_count, 'shared project'), countries].filter(Boolean).join(' · '),
        renderDetail: () => <CollaborationDetail edge={edge} />,
    }
}

export const arcsVisualization: Visualization = {
    id: 'arcs',
    label: 'Arcs + institutions',
    title: 'Collaboration network',
    description: 'Arcs between collaborating institutions, weighted by shared projects',
    itemNoun: 'collaborations',
    emptyDetailHint: 'Select a collaboration from the list or click an arc on the map.',
    prepare: (edges) => ({
        items: [...edges].sort((a, b) => b.project_count - a.project_count).map(toItem),
        createLayers: (colors, {selectedId, onSelect}) => [
            new ArcCollaborationLayer({
                id: 'collaboration-arcs',
                data: edges,
                primaryColorHex: colors.primary,
                secondaryColorHex: colors.secondary,
                highlightColorHex: colors.highlight,
                selectedEdgeId: selectedId,
                // Shared with the institution icons, which have no edge to select.
                onClick: (info) => {
                    const object = info.object as Partial<CollaborationEdge> | undefined
                    if (object?.collaborator_id) onSelect(collaborationEdgeId(object as CollaborationEdge))
                },
            }),
        ],
    }),
}
