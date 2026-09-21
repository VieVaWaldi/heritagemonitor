import type {CollaborationEdge} from '@heritagemonitor/shared'

export interface ProjectSummary {
    id: string
    title: string
    startDate: string | null
    endDate: string | null
    frameworkProgrammes: string[]
    /** What this project cost the organisation(s) the list belongs to */
    cost: number
}

export interface Organisation {
    id: string
    name: string
    country: string | null
    type: string | null
    sme: boolean | null
    geolocation: [number, number]
    /** Distinct projects, each counted once however many partners it was shared with */
    projects: ProjectSummary[]
    /** Sum of this organisation's own cost over `projects` */
    funding: number
}

// Same edge, seen from each side — keeps the two participant field
// families (institution_* / collaborator_*) out of everything downstream.
function sides(edge: CollaborationEdge) {
    return [
        {
            id: edge.institution_id,
            name: edge.institution_name,
            country: edge.institution_country,
            type: edge.institution_type,
            sme: edge.institution_sme,
            geolocation: edge.institution_geolocation,
            cost: (p: CollaborationEdge['projects'][number]) => p.institution_cost,
        },
        {
            id: edge.collaborator_id,
            name: edge.collaborator_name,
            country: edge.collaborator_country,
            type: edge.collaborator_type,
            sme: edge.collaborator_sme,
            geolocation: edge.collaborator_geolocation,
            cost: (p: CollaborationEdge['projects'][number]) => p.collaborator_cost,
        },
    ]
}

// One organisation per distinct id, biggest funding first. An org's projects
// repeat on every edge it's on, so they're de-duplicated by project id here —
// that is what makes `funding` an exact sum rather than a double count.
export function organisationsFromEdges(edges: CollaborationEdge[]): Organisation[] {
    const byId = new Map<string, Organisation>()
    const seenProjects = new Map<string, Set<string>>()

    for (const edge of edges) {
        for (const side of sides(edge)) {
            let org = byId.get(side.id)
            if (!org) {
                org = {
                    id: side.id,
                    name: side.name,
                    country: side.country,
                    type: side.type,
                    sme: side.sme,
                    geolocation: side.geolocation,
                    projects: [],
                    funding: 0,
                }
                byId.set(side.id, org)
                seenProjects.set(side.id, new Set())
            }
            const seen = seenProjects.get(side.id)!

            for (const project of edge.projects) {
                if (seen.has(project.project_id)) continue
                seen.add(project.project_id)
                const cost = side.cost(project)
                org.projects.push({
                    id: project.project_id,
                    title: project.title,
                    startDate: project.start_date,
                    endDate: project.end_date,
                    frameworkProgrammes: project.framework_programmes ?? [],
                    cost,
                })
                org.funding += cost
            }
        }
    }

    for (const org of byId.values()) org.projects.sort((a, b) => b.cost - a.cost)
    return Array.from(byId.values()).sort((a, b) => b.funding - a.funding)
}
