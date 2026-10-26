import type {CollaborationEdge} from '@heritagemonitor/shared'
import type {ArcNetworkLink, ArcNetworkNode} from '@/common/deckgl'

// ADAPTER: CollaborationEdge[] -> the generic arc network shapes in
// @/common/deckgl. The two participant field families (institution_* /
// collaborator_*) stop here and never reach a layer.

/** Same id the API's OpenSearch documents use (see the demo's opensearch.repository.ts). */
export function collaborationEdgeId(edge: CollaborationEdge): string {
    return `${edge.institution_id}_${edge.collaborator_id}`
}

export function arcLinksFromEdges(edges: CollaborationEdge[]): ArcNetworkLink[] {
    return edges.map((edge) => ({
        id: collaborationEdgeId(edge),
        source: edge.institution_geolocation,
        target: edge.collaborator_geolocation,
        weight: edge.project_count,
    }))
}

/**
 * One node per institution, not per edge: an institution touched by 40 edges
 * is one hub, not 40 overlapping icons. This is the single place that
 * de-duplicates, so the icons always read the same numbers.
 */
export function arcNodesFromEdges(edges: CollaborationEdge[]): ArcNetworkNode[] {
    const byId = new Map<string, ArcNetworkNode>()

    function accumulate(id: string, geolocation: [number, number]) {
        const existing = byId.get(id)
        if (existing) existing.linkCount += 1
        else byId.set(id, {id, geolocation, linkCount: 1})
    }

    for (const edge of edges) {
        accumulate(edge.institution_id, edge.institution_geolocation)
        accumulate(edge.collaborator_id, edge.collaborator_geolocation)
    }

    return Array.from(byId.values())
}
