export interface Cache {
    get<T>(key: string): T | undefined

    set<T>(key: string, value: T, ttlMs: number): void

    del(key: string): void
}

// Swap for a RedisCache implementing the same interface if this ever needs
// to be shared across multiple api instances.
export class InMemoryCache implements Cache {
    private readonly store = new Map<string, { value: unknown; expiresAt: number }>()

    // Capping entry count and evicting the oldest insertion
    // (Map preserves insertion order) is the cheap fix.
    constructor(private readonly maxEntries = 1000) {
    }

    get<T>(key: string): T | undefined {
        const entry = this.store.get(key)
        if (!entry) return undefined

        if (entry.expiresAt < Date.now()) {
            this.store.delete(key)
            return undefined
        }

        return entry.value as T
    }

    set<T>(key: string, value: T, ttlMs: number): void {
        this.store.delete(key)
        if (this.store.size >= this.maxEntries) {
            const oldestKey = this.store.keys().next().value
            if (oldestKey !== undefined) this.store.delete(oldestKey)
        }
        this.store.set(key, {value, expiresAt: Date.now() + ttlMs})
    }

    del(key: string): void {
        this.store.delete(key)
    }
}
