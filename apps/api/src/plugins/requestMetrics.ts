import type {FastifyInstance} from 'fastify'
import {recordRequestDuration} from '../modules/monitoring/monitoring.service.js'

// Sibling to requestLog.ts — same onResponse hook point, separate concern.
// requestLog writes one line per request for humans/grep; this feeds the
// in-memory aggregate the /health/requestTime dashboard reads from. Kept
// apart so changes to one concern never ripple into the other.
export function registerRequestMetrics(fastify: FastifyInstance) {
    fastify.addHook('onResponse', async (request, reply) => {
        const routeKey = request.routeOptions.url
        // Unmatched routes (404s) have no route pattern — recording them
        // under raw incoming paths would let cardinality grow with whatever
        // a client happens to request, unbounded by our own route table.
        if (!routeKey) return

        recordRequestDuration(`${request.method} ${routeKey}`, reply.elapsedTime)
    })
}
