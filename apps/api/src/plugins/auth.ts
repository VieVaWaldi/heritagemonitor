import type {FastifyInstance, FastifyReply, FastifyRequest} from 'fastify'

declare module 'fastify' {
    interface FastifyRequest {
        user: unknown | null
    }
}

export function registerAuthPlaceholder(fastify: FastifyInstance) {
    fastify.decorateRequest('user', null)
}

// TODO: placeholder seam for real auth. Once a session/token scheme exists,
// this should verify it and set request.user; until then it just rejects.
export async function requireAuth(_request: FastifyRequest, reply: FastifyReply) {
    reply.status(501).send({error: 'Auth not implemented yet'})
}
