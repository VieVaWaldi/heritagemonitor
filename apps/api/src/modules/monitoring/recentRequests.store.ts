// Data-access layer for the "last 100 raw requests" live feed.
//
// Unlike requestMetrics.store.ts this isn't windowed by time or bucketed —
// it's just "whatever fits", a fixed-capacity ring buffer that overwrites the
// oldest entry once full. record() runs in the onResponse hook (i.e. on
// every request), so it only ever writes into pre-allocated slots, never
// grows/shifts an array.

export interface RecentRequestEntry {
    timestamp: number // epoch ms
    method: string
    path: string
    query: Record<string, string>
    statusCode: number
    durationMs: number
}

export interface RecentRequestsStore {
    record(entry: RecentRequestEntry): void

    // Newest first.
    list(): RecentRequestEntry[]
}

export const CAPACITY = 100

class RingBuffer implements RecentRequestsStore {
    private readonly entries: (RecentRequestEntry | undefined)[] = new Array(CAPACITY)
    private writeIndex = 0
    private count = 0

    record(entry: RecentRequestEntry): void {
        this.entries[this.writeIndex] = entry
        this.writeIndex = (this.writeIndex + 1) % CAPACITY
        this.count = Math.min(this.count + 1, CAPACITY)
    }

    list(): RecentRequestEntry[] {
        const result: RecentRequestEntry[] = []
        for (let i = 0; i < this.count; i++) {
            const idx = (this.writeIndex - 1 - i + CAPACITY) % CAPACITY
            const entry = this.entries[idx]
            if (entry) result.push(entry)
        }
        return result
    }
}

export const inMemoryRecentRequestsStore: RecentRequestsStore = new RingBuffer()
