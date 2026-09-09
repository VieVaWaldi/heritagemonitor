import type {FastifyInstance} from 'fastify'

// Single structured line per request, replacing Fastify's default two-line
// (incoming/completed) logging.
export function registerRequestLog(fastify: FastifyInstance) {
    fastify.addHook('onResponse', async (request, reply) => {
        request.log.info({
            type: 'request',
            method: request.method,
            route: request.routeOptions.url,
            statusCode: reply.statusCode,
            durationMs: reply.elapsedTime,
            bytesSent: reply.getHeader('content-length') ?? null,
        })
    })
}
