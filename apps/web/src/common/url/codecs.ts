// Every query-param name the app reads or writes, in one place — nothing
// hand-rolls a 'q'/'sel'/'page' string anywhere else (apps/web/RULES.md #11).
// The names are also the api's own querystring names (see
// packages/shared/src/projects.ts): the search hook forwards the page's URL
// params to /v1/<entity>/search unchanged, so a new filter is one name in one
// place rather than a URL name plus an api name plus a mapping between them.
export const SEARCH_PARAM = {
    query: 'q',
    entity: 'e',
    corpus: 'c',
    page: 'page',
    sort: 'sort',
    /** The row whose detail panel is open. */
    selection: 'sel',
    /** Deep link: restrict the list to one entity, with a "clear" chip. */
    only: 'only',
    /** The active tab of the detail panel. */
    tab: 'tab',
} as const

export type SearchParamName = (typeof SEARCH_PARAM)[keyof typeof SEARCH_PARAM]

/**
 * Params that describe what the user is LOOKING AT, not what was searched
 * for. They never reach the api — sending `sel`/`tab` to a search endpoint
 * would make two identical result sets look like different requests (and
 * miss the api's cache).
 */
export const WEB_ONLY_PARAMS: readonly string[] = [SEARCH_PARAM.entity, SEARCH_PARAM.selection, SEARCH_PARAM.tab]

/**
 * Params whose change does NOT invalidate the current page of results.
 * Everything else (a new query, filter, sort or corpus) produces a different
 * result set, so the page must go back to 1 — see useUrlState's `update`.
 */
export const PAGE_PRESERVING_PARAMS: ReadonlySet<string> = new Set([
    SEARCH_PARAM.page,
    SEARCH_PARAM.selection,
    SEARCH_PARAM.tab,
])

// Pure read/write of URL params: no React, no next/navigation, so every rule
// here (what an invalid value falls back to, which caps apply, what reaches
// the api) is unit-testable on its own. The hooks in this folder are thin
// wrappers around these functions; nothing outside common/url parses a URL.

/** A patch value: a string/number sets, `null` removes, `undefined` leaves the param untouched. */
export type UrlParamValue = string | number | readonly string[] | null | undefined
export type UrlPatch = Readonly<Record<string, UrlParamValue>>

/** A repeated param (`?funder=EC&funder=NIH`) never carries more values than this. */
export const MAX_VALUES_PER_PARAM = 50

// --- reading ----------------------------------------------------------------

/** Trimmed text, or '' when absent. */
export function readText(params: URLSearchParams, name: string): string {
    return (params.get(name) ?? '').trim()
}

/** The value if it is one of `allowed`, else `fallback` — an invalid value in a shared link must not break the page. */
export function readOneOf<T extends string>(params: URLSearchParams, name: string, allowed: readonly T[], fallback: T): T {
    const value = params.get(name)
    return allowed.includes(value as T) ? (value as T) : fallback
}

/** Same, but nothing selected is a legitimate state (e.g. no explicit sort). */
export function readOptionalOneOf<T extends string>(params: URLSearchParams, name: string, allowed: readonly T[]): T | null {
    const value = params.get(name)
    return allowed.includes(value as T) ? (value as T) : null
}

/** 1-based page, clamped to `maxPage`; anything unparseable is page 1. */
export function readPage(params: URLSearchParams, maxPage: number): number {
    const raw = Number(params.get(SEARCH_PARAM.page))
    if (!Number.isInteger(raw) || raw < 1) return 1
    return Math.min(raw, maxPage)
}

/**
 * All values of a repeated param, de-duplicated, capped. Values are NOT
 * validated against a vocabulary: which funder codes exist is the api's
 * business, and a link must keep working when a new one is added.
 */
export function readList(params: URLSearchParams, name: string, max = MAX_VALUES_PER_PARAM): string[] {
    const values = params.getAll(name).filter((value) => value.trim() !== '')
    return [...new Set(values)].slice(0, max)
}

/** Ids are read as opaque strings, never parsed as numbers — a 20-digit project id would lose precision. */
export function readId(params: URLSearchParams, name: string): string | null {
    const value = params.get(name)?.trim()
    return value ? value : null
}

// --- writing ----------------------------------------------------------------

/**
 * Applies a patch to a copy of `params`, keeping every param it does not
 * mention (unknown ones included — a slice must not drop another slice's
 * state just by updating its own).
 */
export function applyPatch(params: URLSearchParams, patch: UrlPatch): URLSearchParams {
    const next = new URLSearchParams(params)
    for (const [name, value] of Object.entries(patch)) {
        if (value === undefined) continue
        next.delete(name)
        if (value === null) continue
        if (Array.isArray(value)) {
            for (const entry of value.slice(0, MAX_VALUES_PER_PARAM)) if (entry !== '') next.append(name, entry)
            continue
        }
        const text = String(value)
        if (text !== '') next.set(name, text)
    }
    return next
}

/**
 * True when a patch changes WHICH results match, so page 1 is the only
 * honest page to show them on (a user on page 7 of "heritage" who switches
 * to DCH is not on page 7 of anything).
 */
export function patchInvalidatesPage(patch: UrlPatch): boolean {
    return Object.entries(patch).some(([name, value]) => value !== undefined && !PAGE_PRESERVING_PARAMS.has(name))
}

/** Sorted for a stable string: the search hook keys its fetch on it, so param order must not cause a refetch. */
export function toQueryString(params: URLSearchParams): string {
    const sorted = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return new URLSearchParams(sorted).toString()
}

/**
 * The params the api actually gets: the page's own URL minus the web-only
 * view state (see WEB_ONLY_PARAMS). Everything else is forwarded verbatim,
 * which is what keeps the URL and the api contract from drifting apart.
 */
export function toApiSearchParams(params: URLSearchParams): string {
    const next = new URLSearchParams(params)
    for (const name of WEB_ONLY_PARAMS) next.delete(name)
    // page=1 is the default on both sides; leaving it out keeps the api's
    // cache key (and the URL) free of a value that means "nothing special".
    if (next.get(SEARCH_PARAM.page) === '1') next.delete(SEARCH_PARAM.page)
    return toQueryString(next)
}

// --- links between routes ---------------------------------------------------

export interface SearchUrlParams {
    /** Destination pathname, e.g. a UseCase's action.route ('/search', '/search/experts', ...). */
    route: string
    query?: string
    entity?: string
    corpus?: string
    /** Restrict the destination list to this id (deep link from another entity's row). */
    only?: string
    /** Open this id's detail panel on arrival. */
    selection?: string
    tab?: string
}

/**
 * The one builder for a link from one route to another (a project's
 * organisation row -> `/search?e=organisations&only=<id>&sel=<id>&c=dch`).
 * Built on the same param names and the same writer as every in-page update,
 * so a link can never produce a URL the reading side does not understand.
 */
export function buildSearchUrl({route, query, entity, corpus, only, selection, tab}: SearchUrlParams): string {
    const params = applyPatch(new URLSearchParams(), {
        [SEARCH_PARAM.query]: query ?? null,
        [SEARCH_PARAM.entity]: entity ?? null,
        [SEARCH_PARAM.corpus]: corpus ?? null,
        [SEARCH_PARAM.only]: only ?? null,
        [SEARCH_PARAM.selection]: selection ?? null,
        [SEARCH_PARAM.tab]: tab ?? null,
    })
    const queryString = params.toString()
    return queryString ? `${route}?${queryString}` : route
}
