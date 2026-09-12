import {z} from 'zod'

// Contract for GET /v1/monitoring/request-time and /v1/monitoring/routes,
// shared between apps/api (produces) and apps/web (validates at the network
// boundary before trusting it). See apps/api/src/modules/monitoring for the
// in-memory ring-buffer implementation behind this.

export const requestTimeWindowSchema = z.enum(['1m', '1h', '6h', '24h', '7d', '14d'])
export type RequestTimeWindow = z.infer<typeof requestTimeWindowSchema>

export const requestTimeBucketSchema = z.object({
    bucketStart: z.coerce.date(),
    count: z.number(),
    avgMs: z.number(),
    minMs: z.number(),
    maxMs: z.number(),
})
export type RequestTimeBucket = z.infer<typeof requestTimeBucketSchema>

export const requestTimeSeriesResponseSchema = z.object({
    // null means "all tracked routes combined", not a specific route.
    route: z.string().nullable(),
    window: requestTimeWindowSchema,
    buckets: z.array(requestTimeBucketSchema),
})
export type RequestTimeSeriesResponse = z.infer<typeof requestTimeSeriesResponseSchema>

export const monitoredRoutesResponseSchema = z.object({
    // "METHOD /path" pairs, e.g. "GET /v1/health" — the fastify route pattern,
    // never a raw incoming URL, so cardinality stays bounded by the app's own
    // route table rather than by what a client happens to request.
    routes: z.array(z.string()),
})
export type MonitoredRoutesResponse = z.infer<typeof monitoredRoutesResponseSchema>

// Contract for GET /v1/monitoring/request-count — total requests per route
// within the window, not a time series. Routes with zero requests in the
// window are omitted rather than sent as zero-count entries.
export const routeRequestCountSchema = z.object({
    route: z.string(),
    count: z.number(),
})
export type RouteRequestCount = z.infer<typeof routeRequestCountSchema>

export const requestCountResponseSchema = z.object({
    window: requestTimeWindowSchema,
    counts: z.array(routeRequestCountSchema),
})
export type RequestCountResponse = z.infer<typeof requestCountResponseSchema>
