import rateLimit from '@fastify/rate-limit'
import type {FastifyInstance} from 'fastify'

// A generous per-IP ceiling on every route, so no single client can monopolise
// the api. Routes that are expensive per call (the exports) tighten it through
// their own `config.rateLimit`. Keyed on request.ip, which is the real client
// behind Caddy because index.ts sets `trustProxy: true`.
export async function registerRateLimit(fastify: FastifyInstance) {
    await fastify.register(rateLimit, {max: 300, timeWindow: '1 minute'})
}
