import type {CorpusKey, EntityKey} from '@/common/catalog'

// Centralized query-param names for every /search-bound URL, so nothing
// hand-rolls 'q'/'e'/'c' strings elsewhere. See apps/web/RULES.md #11.
export const SEARCH_PARAM = {
    query: 'q',
    entity: 'e',
    corpus: 'c',
} as const

export interface SearchUrlParams {
    /** Destination pathname, e.g. a UseCase's action.route ('/search', '/search/experts', ...). */
    route: string
    query?: string
    entity?: EntityKey
    corpus?: CorpusKey
}

// The one place that turns a selection (use case route + entity + corpus +
// free-text query) into the URL /search (and friends) will read back out.
// Kept framework-agnostic (no next/navigation import) so it's trivially
// testable and reusable from anywhere that isn't a client component.
export function buildSearchUrl({route, query, entity, corpus}: SearchUrlParams): string {
    const params = new URLSearchParams()
    if (query) params.set(SEARCH_PARAM.query, query)
    if (entity) params.set(SEARCH_PARAM.entity, entity)
    if (corpus) params.set(SEARCH_PARAM.corpus, corpus)

    const queryString = params.toString()
    return queryString ? `${route}?${queryString}` : route
}
