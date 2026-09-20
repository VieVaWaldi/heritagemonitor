import type {CollaborationEdge} from '@heritagemonitor/shared'

// Every visualization below (Arc's icons, Column) needs the same thing: one
// point per institution, not per edge — an institution touched by 40 edges
// should count as one hub, not 40 overlapping points. This is the single
// place that dedupes/aggregates edges down to institution points, so both
// visualizations read the same numbers for the same institution.
export interface InstitutionPoint {
    id: string
    geolocation: [number, number]
    /** Distinct collaboration partners */
    edgeCount: number
    /** Total shared projects across all of this institution's edges */
    projectCount: number
}

export function institutionPoints(edges: CollaborationEdge[]): InstitutionPoint[] {
    const byId = new Map<string, InstitutionPoint>()

    function accumulate(id: string, geolocation: [number, number], projectCount: number) {
        const existing = byId.get(id)
        if (existing) {
            existing.edgeCount += 1
            existing.projectCount += projectCount
        } else {
            byId.set(id, {id, geolocation, edgeCount: 1, projectCount})
        }
    }

    for (const edge of edges) {
        accumulate(edge.institution_id, edge.institution_geolocation, edge.project_count)
        accumulate(edge.collaborator_id, edge.collaborator_geolocation, edge.project_count)
    }

    return Array.from(byId.values())
}
