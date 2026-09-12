import type {RequestTimeBucket, RequestTimeWindow, RouteRequestCount} from '@heritagemonitor/shared'
import {BUCKET_MS, inMemoryRequestMetricsStore as store, type RawBucket} from './requestMetrics.store.js'

// Business logic: window→ms mapping and downsampling to a chart-friendly
// point count. Everything here works unchanged if `store` is later swapped for a Postgres-backed

const WINDOW_MS: Record<RequestTimeWindow, number> = {
    '1m': 60_000,
    '1h': 3_600_000,
    '6h': 21_600_000,
    '24h': 86_400_000,
    '7d': 604_800_000,
    '14d': 1_209_600_000,
}

// Cap on datapoints returned per request, regardless of window
const TARGET_POINTS = 300

export function recordRequestDuration(routeKey: string, durationMs: number): void {
    store.record(routeKey, durationMs)
}

export function listMonitoredRoutes(): string[] {
    return store.listRoutes()
}

export function getRequestTimeSeries(routeKey: string | null, window: RequestTimeWindow): RequestTimeBucket[] {
    const windowMs = WINDOW_MS[window]
    const raw = routeKey === null ? store.queryAll(windowMs) : store.queryRoute(routeKey, windowMs)
    return downsample(raw, windowMs)
}

// A histogram, total requests per route within the window.
export function getRequestCountByRoute(window: RequestTimeWindow): RouteRequestCount[] {
    const windowMs = WINDOW_MS[window]

    return store
        .listRoutes()
        .map((route) => ({
            route,
            count: store.queryRoute(route, windowMs).reduce((total, bucket) => total + bucket.count, 0),
        }))
        .filter((entry) => entry.count > 0)
        .sort((a, b) => b.count - a.count)
}

function downsample(raw: RawBucket[], windowMs: number): RequestTimeBucket[] {
    if (raw.length === 0) return []

    const rawBucketCount = Math.ceil(windowMs / BUCKET_MS)
    const step = Math.max(1, Math.ceil(rawBucketCount / TARGET_POINTS))
    if (step === 1) return raw.map(toRequestTimeBucket)

    const groupSpanMs = BUCKET_MS * step
    const groups = new Map<number, RawBucket[]>()

    for (const bucket of raw) {
        const groupStart = Math.floor(bucket.bucketStart / groupSpanMs) * groupSpanMs
        const group = groups.get(groupStart)
        if (group) group.push(bucket)
        else groups.set(groupStart, [bucket])
    }

    return [...groups.entries()]
        .sort(([a], [b]) => a - b)
        .map(([groupStart, bucketsInGroup]) => {
            const count = bucketsInGroup.reduce((total, b) => total + b.count, 0)
            const sum = bucketsInGroup.reduce((total, b) => total + b.sum, 0)
            return {
                bucketStart: new Date(groupStart),
                count,
                avgMs: sum / count,
                minMs: Math.min(...bucketsInGroup.map((b) => b.min)),
                maxMs: Math.max(...bucketsInGroup.map((b) => b.max)),
            }
        })
}

function toRequestTimeBucket(bucket: RawBucket): RequestTimeBucket {
    return {
        bucketStart: new Date(bucket.bucketStart),
        count: bucket.count,
        avgMs: bucket.sum / bucket.count,
        minMs: bucket.min,
        maxMs: bucket.max,
    }
}
