import {readFile} from 'node:fs/promises'
import {client, indices} from '@heritagemonitor/search'

// Repository layer: raw OpenSearch access only, no business logic.

// The seed lives inside this module (not apps/web/public, even though a
// duplicate of the same file is committed there for direct download/reuse
// outside these apps) — apps/api's Docker container only ever mounts
// apps/api + packages/*, never apps/web, so reading across app boundaries
// at runtime wouldn't even resolve. See packages/search's
// demoCollaboration.ts for why this index exists.
const SEED_FILE_URL = new URL('./seed/collaboration-edges.json', import.meta.url)

interface RawCollaborationProject {
    project_id: string
    title: string
    total_cost: number | null
    combined_institution_cost: number | null
    institution_cost: number
    collaborator_cost: number
    start_date: string | null
    end_date: string | null
    framework_programmes: string[] | null
}

interface RawCollaborationEdge {
    institution_id: string
    institution_name: string
    institution_geolocation: [number, number]
    institution_country: string | null
    institution_type: string | null
    institution_sme: boolean | null
    collaborator_id: string
    collaborator_name: string
    collaborator_geolocation: [number, number]
    collaborator_country: string | null
    collaborator_type: string | null
    collaborator_sme: boolean | null
    project_count: number
    projects: RawCollaborationProject[]
}

// Same operator-precedence cast as apps/api's other repositories (see
// health/opensearch.repository.ts) — the client's generated hit type loses `_id`.
interface CollaborationEdgeHit {
    _id: string
    _source?: RawCollaborationEdge
}

// The whole demo dataset is ~1000 docs — well under OpenSearch's default
// 10,000 result-window cap, so one plain search covers it. No pagination.
const ALL_EDGES_SIZE = 1000

export async function getAllEdges(): Promise<RawCollaborationEdge[]> {
    await indices.ensureDemoCollaborationIndex(client)

    const {body} = await client.search({
        index: indices.demoCollaborationIndexName,
        body: {size: ALL_EDGES_SIZE, query: {match_all: {}}},
    })

    const hits = body.hits.hits as unknown as CollaborationEdgeHit[]
    return hits.map((hit) => hit._source).filter((doc): doc is RawCollaborationEdge => doc != null)
}

// Rebuilds the index from the committed seed — the rehearsal for bulk-
// importing OpenSearch at real scale later. Each edge gets a deterministic
// id (the institution pair), so re-running this overwrites in place instead
// of piling up duplicates.
export async function reindexFromSeed(): Promise<{indexed: number}> {
    await indices.ensureDemoCollaborationIndex(client)

    const raw = await readFile(SEED_FILE_URL, 'utf-8')
    const edges = JSON.parse(raw) as RawCollaborationEdge[]

    const bulkBody = edges.flatMap((edge) => [
        {index: {_index: indices.demoCollaborationIndexName, _id: `${edge.institution_id}_${edge.collaborator_id}`}},
        edge,
    ])

    const {body} = await client.bulk({body: bulkBody, refresh: true})
    if (body.errors) {
        const firstError = (body.items as Array<{index?: {error?: unknown}}>).find((item) => item.index?.error)?.index?.error
        throw new Error(`Bulk index into ${indices.demoCollaborationIndexName} failed: ${JSON.stringify(firstError)}`)
    }

    return {indexed: edges.length}
}
