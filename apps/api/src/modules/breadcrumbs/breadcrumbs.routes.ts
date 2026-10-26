import {breadcrumbSchema, type BreadcrumbsResponse} from '@heritagemonitor/shared'
import type {FastifyInstance} from 'fastify'
import {recentBreadcrumbs, recordBreadcrumb} from './breadcrumbs.service.js'

// Transport layer. POST is written by every visitor's browser, so it is the
// one unauthenticated WRITE endpoint in the api and is treated accordingly:
// a tiny body limit, a strict shape (see breadcrumbSchema), and a per-IP rate
// limit. The IP is used for that limit and then dropped — it is never stored.

/** Bigger than any real crumb, small enough that a flood costs nothing to reject. */
const MAX_BODY_BYTES = 4_096

/** Per IP. A visitor navigating fast still stays well under this. */
const RATE_LIMIT_PER_MINUTE = 120
const RATE_WINDOW_MS = 60 * 1000

// In-memory and per-process, like the rest of the api's own counters. Good
// enough for what this defends against: an accidental loop or a casual script,
// not a distributed attack, which is Caddy's job.
const hits = new Map<string, {count: number; resetAt: number}>()

function withinRateLimit(ip: string): boolean {
    const now = Date.now()
    const entry = hits.get(ip)

    if (!entry || now >= entry.resetAt) {
        hits.set(ip, {count: 1, resetAt: now + RATE_WINDOW_MS})
        // Opportunistic cleanup: this map must not grow without bound.
        if (hits.size > 10_000) {
            for (const [key, value] of hits) if (now >= value.resetAt) hits.delete(key)
        }
        return true
    }

    entry.count += 1
    return entry.count <= RATE_LIMIT_PER_MINUTE
}

export async function breadcrumbsRoutes(fastify: FastifyInstance) {
    fastify.post(
        '/breadcrumbs',
        {bodyLimit: MAX_BODY_BYTES},
        async (request, reply): Promise<{ok: true} | {error: string}> => {
            if (!withinRateLimit(request.ip)) {
                reply.code(429)
                return {error: 'Too many breadcrumbs'}
            }

            const parsed = breadcrumbSchema.safeParse(request.body)
            if (!parsed.success) {
                reply.code(400)
                return {error: 'Malformed breadcrumb'}
            }

            await recordBreadcrumb(parsed.data)
            // 204: the browser sends this with sendBeacon during navigation and
            // never reads the answer.
            reply.code(204)
            return {ok: true}
        },
    )

    fastify.get('/breadcrumbs', async (): Promise<BreadcrumbsResponse> => recentBreadcrumbs())
}
