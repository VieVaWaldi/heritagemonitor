import type {FastifyInstance} from 'fastify'

// Sets Cache-Control: no-store on every response, no client or proxy may
// cache and reuse a response later. Standard practice for a dynamic JSON
// API, unrelated to prod VM network restrictions, and unrelated to cache.ts's
// in-process InMemoryCache (a separate, internal concern this doesn't touch).
export function registerNoStore(fastify: FastifyInstance) {
    fastify.addHook('onSend', async (_request, reply) => {
        reply.header('Cache-Control', 'no-store')
    })
}
