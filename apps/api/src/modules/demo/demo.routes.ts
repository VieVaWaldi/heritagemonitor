import type {CollaborationEdgesResponse} from '@heritagemonitor/shared'
import type {FastifyInstance} from 'fastify'
import {listCollaborationEdges, reindexCollaborationEdges} from './demo.service.js'

// Transport layer: HTTP concerns only. See apps/api/RULES.md rules 9 and 14.

export async function demoRoutes(fastify: FastifyInstance) {
    fastify.get('/demo/collaboration-edges', async (): Promise<CollaborationEdgesResponse> => {
        return {edges: await listCollaborationEdges()}
    })

    // Not called by apps/web — this is the manually-triggered rehearsal for
    // bulk-importing OpenSearch at real scale later (hit it with curl, or
    // after wiping the opensearch volume). Safe to call repeatedly, see
    // opensearch.repository.ts's reindexFromSeed.
    fastify.post('/demo/collaboration-edges/reindex', async () => {
        return reindexCollaborationEdges()
    })
}
