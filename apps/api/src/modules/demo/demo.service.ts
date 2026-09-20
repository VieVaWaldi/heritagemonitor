import {collaborationEdgeSchema, type CollaborationEdge} from '@heritagemonitor/shared'
import * as opensearchRepository from './opensearch.repository.js'

// Service layer: OpenSearch-hit -> DTO mapping. See apps/api/RULES.md rule 3.

// Same rationale as minorities.service.ts's parseMinorityDoc — validates
// against the same schema the API's own response contract is built from,
// so a malformed document is dropped and logged here rather than served
// silently mangled.
function parseEdge(raw: unknown): CollaborationEdge | null {
    const result = collaborationEdgeSchema.safeParse(raw)
    if (result.success) return result.data

    console.warn('Collaboration edge document failed schema validation:', result.error.issues)
    return null
}

export async function listCollaborationEdges(): Promise<CollaborationEdge[]> {
    const raw = await opensearchRepository.getAllEdges()
    return raw.map(parseEdge).filter((edge): edge is CollaborationEdge => edge !== null)
}

export function reindexCollaborationEdges(): Promise<{indexed: number}> {
    return opensearchRepository.reindexFromSeed()
}
