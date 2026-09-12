// Data-access layer for request-timing metrics
//
// Implementation: an in-memory ring buffer per route, sized to exactly
// RETENTION_DAYS worth of 1-minute slots. `record()` runs in the onResponse
// hook — i.e. on every single request — so it must never allocate. Four
// parallel Float64Arrays (struct-of-arrays) make that a property of the data
// structure rather than a discipline to maintain: writing a duration is just
// `arr[idx] = value`, no object churn for the GC to trace. The ring wrapping
// around is also what gives us retention-based eviction for free — a slot
// from 14 days ago is simply overwritten, no separate GC pass needed.
//
// Swapping this for a durable, Postgres-backed store later (periodic rollup
// flushes, not one row per request) only means implementing
// RequestMetricsStore again — nothing above this file needs to change.

export interface RawBucket {
    bucketStart: number // epoch ms, start of the minute
    count: number
    sum: number
    min: number
    max: number
}

export interface RequestMetricsStore {
    record(routeKey: string, durationMs: number, now?: number): void

    queryRoute(routeKey: string, windowMs: number, now?: number): RawBucket[]

    // Merged across every currently-tracked route — the "all routes" view.
    queryAll(windowMs: number, now?: number): RawBucket[]

    // Also lazily evicts routes that haven't been hit in a full retention
    // window, since their data has already aged out of the ring anyway.
    listRoutes(now?: number): string[]
}

export const BUCKET_MS = 60_000

const RETENTION_DAYS = Number(process.env.REQUEST_METRICS_RETENTION_DAYS) || 14
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000
const RING_SIZE = Math.ceil(RETENTION_MS / BUCKET_MS)

class RouteRing {
    private readonly bucketStart = new Float64Array(RING_SIZE)
    private readonly count = new Float64Array(RING_SIZE)
    private readonly sum = new Float64Array(RING_SIZE)
    private readonly min = new Float64Array(RING_SIZE)
    private readonly max = new Float64Array(RING_SIZE)
    lastWriteMs = 0

    record(durationMs: number, now: number): void {
        const minuteStart = Math.floor(now / BUCKET_MS) * BUCKET_MS
        const idx = Math.floor(minuteStart / BUCKET_MS) % RING_SIZE

        // A slot's own bucketStart tells us which minute it actually holds —
        // wraparound means the slot at this index may still hold a stale
        // minute from RETENTION_DAYS ago, so reset before accumulating.
        if (this.bucketStart[idx] !== minuteStart) {
            this.bucketStart[idx] = minuteStart
            this.count[idx] = 0
            this.sum[idx] = 0
            this.min[idx] = Infinity
            this.max[idx] = -Infinity
        }

        this.count[idx] += 1
        this.sum[idx] += durationMs
        if (durationMs < this.min[idx]) this.min[idx] = durationMs
        if (durationMs > this.max[idx]) this.max[idx] = durationMs
        this.lastWriteMs = now
    }

    query(windowMs: number, now: number): RawBucket[] {
        const windowStart = now - windowMs
        const result: RawBucket[] = []

        for (let i = 0; i < RING_SIZE; i++) {
            // count[i] === 0 covers both "slot never written" and "slot reset
            // on rollover, nothing landed in it yet" — either way, no data.
            if (this.count[i] === 0) continue
            if (this.bucketStart[i] < windowStart || this.bucketStart[i] > now) continue

            result.push({
                bucketStart: this.bucketStart[i],
                count: this.count[i],
                sum: this.sum[i],
                min: this.min[i],
                max: this.max[i],
            })
        }

        return result.sort((a, b) => a.bucketStart - b.bucketStart)
    }
}

const rings = new Map<string, RouteRing>()

function getOrCreateRing(routeKey: string): RouteRing {
    let ring = rings.get(routeKey)
    if (!ring) {
        ring = new RouteRing()
        rings.set(routeKey, ring)
    }
    return ring
}

function mergeBuckets(bucketLists: RawBucket[][]): RawBucket[] {
    const merged = new Map<number, RawBucket>()

    for (const buckets of bucketLists) {
        for (const bucket of buckets) {
            const existing = merged.get(bucket.bucketStart)
            if (!existing) {
                merged.set(bucket.bucketStart, {...bucket})
                continue
            }
            existing.count += bucket.count
            existing.sum += bucket.sum
            existing.min = Math.min(existing.min, bucket.min)
            existing.max = Math.max(existing.max, bucket.max)
        }
    }

    return [...merged.values()].sort((a, b) => a.bucketStart - b.bucketStart)
}

export const inMemoryRequestMetricsStore: RequestMetricsStore = {
    record(routeKey, durationMs, now = Date.now()) {
        getOrCreateRing(routeKey).record(durationMs, now)
    },

    queryRoute(routeKey, windowMs, now = Date.now()) {
        return rings.get(routeKey)?.query(windowMs, now) ?? []
    },

    queryAll(windowMs, now = Date.now()) {
        return mergeBuckets([...rings.values()].map((ring) => ring.query(windowMs, now)))
    },

    listRoutes(now = Date.now()) {
        for (const [key, ring] of rings) {
            if (now - ring.lastWriteMs > RETENTION_MS) rings.delete(key)
        }
        return [...rings.keys()].sort()
    },
}
