import {InMemoryCache} from '../../plugins/cache.js'

// The blank default page of an entity — no query, no filters, just "show me
// what is there" — is both the most-requested search in the app and one of
// the most expensive: ordering 50M works by citation count, or 3.9M projects
// by funded amount, is a full doc-values pass, and it produces the SAME answer
// for everyone until the index changes. Measured on the VM: projects blank +
// facets p50 432 ms, works blank default p50 477 ms warm, far worse cold on
// the HDD (plan section 4a.2).
//
// So the first few pages of exactly that request are held in memory per entity
// and corpus. Nothing else is cached: as soon as a query or a filter is
// involved the answer is the user's own, the hit rate collapses, and stale
// results would be a bug rather than a saving.

/** How long a cached page is served before the index is asked again. */
export const DEFAULT_PAGE_TTL_MS = 60 * 60 * 1000

/**
 * Only the pages people actually walk through. Page 6 onwards is rare enough
 * that caching it would cost memory for nothing.
 */
export const MAX_CACHED_DEFAULT_PAGE = 5

// A cache of its own rather than the `fastify.cache` decorator: services are
// plain module functions here (see any module's *.service.ts), so they have no
// Fastify instance to read a decoration from, and threading one through every
// signature would put transport plumbing into the domain layer. Same
// InMemoryCache class, its own bounded instance.
const cache = new InMemoryCache(200)

export interface DefaultPageKeyParts {
    entity: string
    corpus: string | undefined
    page: number
    sort: string | undefined
}

/**
 * The cache key. Corpus and sort are part of it because they change the
 * answer; `undefined` is spelled out rather than left blank so that
 * `?c=&sort=` and `?c=dch` can never collapse onto the same key.
 */
export function defaultPageKey({entity, corpus, page, sort}: DefaultPageKeyParts): string {
    return `default:${entity}:${corpus ?? 'all'}:${sort ?? 'default'}:${page}`
}

/**
 * Whether a request is THE default one: nothing set but the corpus, the page
 * and the sort. Checked by looking at the request object rather than by a
 * hand-written list of filters, so a filter added later cannot accidentally be
 * cached away.
 */
export function isDefaultRequest(request: Record<string, unknown>, page: number): boolean {
    if (page < 1 || page > MAX_CACHED_DEFAULT_PAGE) return false

    return Object.entries(request).every(([key, value]) => {
        if (key === 'c' || key === 'page' || key === 'sort') return true
        if (value == null) return true
        if (typeof value === 'string') return value.trim() === ''
        if (Array.isArray(value)) return value.length === 0
        return false
    })
}

export function readDefaultPage<T>(key: string): T | undefined {
    return cache.get<T>(key)
}

export function writeDefaultPage<T>(key: string, value: T): void {
    cache.set(key, value, DEFAULT_PAGE_TTL_MS)
}

/** Test seam: the cache is process-wide, so a test must be able to empty it. */
export function clearDefaultPageCache(): void {
    for (let page = 1; page <= MAX_CACHED_DEFAULT_PAGE; page += 1) {
        for (const entity of ['projects', 'organisations', 'works', 'grants', 'funding', 'funding:map']) {
            for (const corpus of ['all', 'science', 'dch']) {
                for (const sort of ['default', 'relevance', 'budget', 'citations', 'funding', 'projects', 'works', 'dchProjects']) {
                    cache.del(`default:${entity}:${corpus}:${sort}:${page}`)
                }
            }
        }
    }
}
