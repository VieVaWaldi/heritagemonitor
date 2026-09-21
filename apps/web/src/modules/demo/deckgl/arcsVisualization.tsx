import type {CollaborationEdge} from '@heritagemonitor/shared'
import {formatCount, type ExplorerItem} from '@/common/deckgl'
import {ArcNetworkLayer} from '@/common/deckgl'
import {arcLinksFromEdges, arcNodesFromEdges, collaborationEdgeId} from './collaborationArcs'
import {CollaborationDetail} from './detail/CollaborationDetail'
import type {Visualization} from './explorerTypes'

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
    prepare: (edges) => {
        // Adapted once per dataset, not per render: the generic layer takes
        // plain links and nodes, so the edge shape stops here.
        const links = arcLinksFromEdges(edges)
        const nodes = arcNodesFromEdges(edges)

        return {
            items: [...edges].sort((a, b) => b.project_count - a.project_count).map(toItem),
            createLayers: (colors, {selectedId, onSelect}) => [
                new ArcNetworkLayer({
                    id: 'collaboration-arcs',
                    data: links,
                    nodes,
                    primaryColorHex: colors.primary,
                    secondaryColorHex: colors.secondary,
                    highlightColorHex: colors.highlight,
                    selectedLinkId: selectedId,
                    // Shared with the institution icons, which have no link to select.
                    onClick: (info) => {
                        const object = info.object as {id?: string; linkCount?: number} | undefined
                        // A node has no link id; only arcs select.
                        if (object?.id && object.linkCount === undefined) onSelect(object.id)
                    },
                }),
            ],
        }
    },
}
