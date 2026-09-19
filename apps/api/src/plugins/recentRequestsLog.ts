import type {FastifyInstance} from 'fastify'
import {recordRecentRequest} from '../modules/monitoring/monitoring.service.js'

// Sibling to requestLog.ts / requestMetrics.ts — same onResponse hook point,
// separate concern: feeds the /health/liveRequests page's raw last-100 feed.
//
// Unlike requestMetrics.ts this isn't keyed by route pattern (no unbounded
// cardinality risk — it's a fixed-size ring buffer), so it happily records
// unmatched paths/404s too, for an accurate picture of raw traffic. Matching
// against the actual request path (not request.routeOptions.url) is also
// what lets this correctly skip a CORS preflight OPTIONS request aimed at a
// monitoring route: Fastify reports those under the wildcard "*" route
// pattern, not the real path, so a routeOptions.url check alone misses them.
const EXCLUDED_PATH_PREFIX = '/v1/monitoring/'

export function registerRecentRequestsLog(fastify: FastifyInstance) {
    fastify.addHook('onResponse', async (request, reply) => {
        // apiClient.ts sets a custom header on every call, which forces a
        // browser CORS preflight ahead of it — @fastify/cors answers that
        // OPTIONS itself before any route handler runs, so it's pure noise
        // duplicating the real request that immediately follows it.
        if (request.method === 'OPTIONS') return

        const path = request.url.split('?')[0] ?? request.url
        if (path.startsWith(EXCLUDED_PATH_PREFIX)) return

        recordRecentRequest({
            timestamp: Date.now(),
            method: request.method,
            path,
            query: normalizeQuery(request.query),
            statusCode: reply.statusCode,
            durationMs: reply.elapsedTime,
        })
    })
}

// Fastify's querystring parser can produce arrays for repeated keys
// (?tag=a&tag=b) — joined here so the response contract stays a plain
// Record<string, string> instead of leaking that variance to every consumer.
function normalizeQuery(query: unknown): Record<string, string> {
    if (!query || typeof query !== 'object') return {}

    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
        result[key] = Array.isArray(value) ? value.join(',') : String(value)
    }
    return result
}
