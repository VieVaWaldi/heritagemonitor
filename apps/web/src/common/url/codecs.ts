import {MAX_URL_TOPICS, formatYearRange, parseYearRange, type YearRange} from '@heritagemonitor/shared'

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
    /** The page of the list INSIDE the detail panel (a project's organisations). */
    detailPage: 'dpage',
    /** `2019-2025` — one param, so a range can never be half-updated. */
    years: 'years',
    theme: 'theme',
    pillar: 'pillar',
    funder: 'funder',
    programme: 'programme',
    region: 'region',
    /** Topic-tree selections; three levels sharing one cap, see readTopicSelection. */
    topic: 'topic',
    subfield: 'subfield',
    field: 'field',
} as const

export type SearchParamName = (typeof SEARCH_PARAM)[keyof typeof SEARCH_PARAM]

/**
 * Params that describe what the user is LOOKING AT, not what was searched
 * for. They never reach the api — sending `sel`/`tab` to a search endpoint
 * would make two identical result sets look like different requests (and
 * miss the api's cache).
 */
export const WEB_ONLY_PARAMS: readonly string[] = [
    SEARCH_PARAM.entity,
    SEARCH_PARAM.selection,
    SEARCH_PARAM.tab,
    SEARCH_PARAM.detailPage,
]

/**
 * Params whose change does NOT invalidate the current page of results.
 * Everything else (a new query, filter, sort or corpus) produces a different
 * result set, so the page must go back to 1 — see useUrlState's `update`.
 */
export const PAGE_PRESERVING_PARAMS: ReadonlySet<string> = new Set([
    SEARCH_PARAM.page,
    SEARCH_PARAM.selection,
    SEARCH_PARAM.tab,
    SEARCH_PARAM.detailPage,
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

/**
 * 1-based page, clamped to `maxPage`; anything unparseable is page 1. `name`
 * picks which page — the results list's (`page`) or the detail panel's
 * (`dpage`).
 */
export function readPage(params: URLSearchParams, maxPage: number, name: string = SEARCH_PARAM.page): number {
    const raw = Number(params.get(name))
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

/**
 * True when a patch invalidates the open detail panel, so the selection has
 * to go back to "the first row of whatever is now listed".
 *
 * A new page, filter, query, sort or corpus means the row that was open is
 * probably not on screen any more, and a detail panel showing something the
 * list no longer contains is confusing. The one exception is a patch that
 * sets `sel` ITSELF: a deep link (`?only=…&sel=…`) or a row click arrives as
 * one patch that changes both, and there the explicit selection must win.
 */
export function patchClearsSelection(patch: UrlPatch): boolean {
    if (patch[SEARCH_PARAM.selection] !== undefined) return false
    return patch[SEARCH_PARAM.page] !== undefined || patchInvalidatesPage(patch)
}

/**
 * True when a patch invalidates the page of the list inside the detail panel:
 * another row, or another tab, means another list.
 */
export function patchClearsDetailPage(patch: UrlPatch): boolean {
    if (patch[SEARCH_PARAM.detailPage] !== undefined) return false
    return patch[SEARCH_PARAM.selection] !== undefined || patch[SEARCH_PARAM.tab] !== undefined || patchClearsSelection(patch)
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

// --- years ------------------------------------------------------------------

/**
 * The year filter, as one `years=2019-2025` param. Parsing (and the clamp to
 * the allowed window) lives in @heritagemonitor/shared so the api applies
 * exactly the same rule to the value this writes.
 */
export function readYears(params: URLSearchParams, today?: Date): YearRange | null {
    return parseYearRange(params.get(SEARCH_PARAM.years), today)
}

export function yearsPatchValue(range: YearRange | null): string | null {
    return range ? formatYearRange(range) : null
}

// --- topics -----------------------------------------------------------------

export interface TopicSelection {
    topic: string[]
    subfield: string[]
    field: string[]
}

export const EMPTY_TOPIC_SELECTION: TopicSelection = {topic: [], subfield: [], field: []}

export function topicSelectionSize(selection: TopicSelection): number {
    return selection.topic.length + selection.subfield.length + selection.field.length
}

/**
 * The three topic-tree levels share ONE cap (MAX_URL_TOPICS), because they are
 * one choice the user makes in one control and each value costs a URL param
 * and a `terms` value. When a link carries more than the cap, the most
 * specific levels are kept first — a selected topic says more about what
 * someone wants than the whole field it sits in.
 */
export function readTopicSelection(params: URLSearchParams): TopicSelection {
    let budget = MAX_URL_TOPICS
    const take = (name: string): string[] => {
        const values = readList(params, name).slice(0, budget)
        budget -= values.length
        return values
    }
    return {
        topic: take(SEARCH_PARAM.topic),
        subfield: take(SEARCH_PARAM.subfield),
        field: take(SEARCH_PARAM.field),
    }
}

/** The patch that writes a whole topic selection, capped the same way. */
export function topicSelectionPatch(selection: TopicSelection): UrlPatch {
    const capped = readTopicSelection(
        new URLSearchParams([
            ...selection.topic.map((value): [string, string] => [SEARCH_PARAM.topic, value]),
            ...selection.subfield.map((value): [string, string] => [SEARCH_PARAM.subfield, value]),
            ...selection.field.map((value): [string, string] => [SEARCH_PARAM.field, value]),
        ]),
    )
    return {
        [SEARCH_PARAM.topic]: capped.topic,
        [SEARCH_PARAM.subfield]: capped.subfield,
        [SEARCH_PARAM.field]: capped.field,
    }
}

// --- describing the current state -------------------------------------------

// What the current URL says, in words. Generated FROM the param vocabulary
// rather than hand-listed per panel, so a filter added to SEARCH_PARAM shows
// up in the chat context automatically instead of being silently missing —
// the unit test for this file fails if a param has no label.

/**
 * A human name for every param the app reads or writes. Typed against
 * `SearchParamName`, so adding a param to SEARCH_PARAM without a label is a
 * compile error, not a quiet omission.
 */
export const URL_PARAM_LABELS: Record<SearchParamName, string> = {
    [SEARCH_PARAM.query]: 'Search text',
    [SEARCH_PARAM.entity]: 'Entity',
    [SEARCH_PARAM.corpus]: 'Corpus',
    [SEARCH_PARAM.page]: 'Page',
    [SEARCH_PARAM.sort]: 'Sort',
    [SEARCH_PARAM.selection]: 'Selected id',
    [SEARCH_PARAM.only]: 'Restricted to id',
    [SEARCH_PARAM.tab]: 'Open tab',
    [SEARCH_PARAM.detailPage]: 'Page within the open tab',
    [SEARCH_PARAM.years]: 'Years',
    [SEARCH_PARAM.theme]: 'Theme',
    [SEARCH_PARAM.pillar]: 'Pillar',
    [SEARCH_PARAM.funder]: 'Funder',
    [SEARCH_PARAM.programme]: 'Programme',
    [SEARCH_PARAM.region]: 'Region',
    [SEARCH_PARAM.topic]: 'Topic',
    [SEARCH_PARAM.subfield]: 'Subfield',
    [SEARCH_PARAM.field]: 'Field',
}

export interface DescribedParam {
    param: string
    label: string
    values: string[]
}

export interface DescribeParamsOptions {
    /**
     * Turns a raw value into something readable — a topic id into its name, a
     * corpus key into its full name. Defaults to the raw value.
     */
    labelValue?: (param: string, value: string) => string
    /** Params to leave out, e.g. ones already stated in the sentence around this list. */
    omit?: readonly string[]
}

/**
 * Every param actually present in the URL, with a human label and readable
 * values. Unknown params (a hand-edited link, a param from a newer version)
 * are reported under their own name rather than dropped: Lucy seeing
 * "maxEdges = 40" is better than her believing nothing is set.
 */
export function describeUrlParams(params: URLSearchParams, options: DescribeParamsOptions = {}): DescribedParam[] {
    const {labelValue = (_param, value) => value, omit = []} = options
    const omitted = new Set(omit)

    const described: DescribedParam[] = []
    for (const param of new Set(params.keys())) {
        if (omitted.has(param)) continue
        const values = params.getAll(param).filter((value) => value.trim() !== '')
        if (values.length === 0) continue
        described.push({
            param,
            label: URL_PARAM_LABELS[param as SearchParamName] ?? param,
            values: values.map((value) => labelValue(param, value)),
        })
    }

    // Stable order, so the same page state always produces the same context
    // string (and therefore does not look like a change to anything watching).
    return described.sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0))
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
 * The link from a row of one entity to that document in another entity's list:
 * "this project's coordinator" -> the organisations list showing exactly that
 * organisation, already open.
 *
 * `only` AND `sel` together, deliberately: `only` restricts the list to the
 * one document (so the page is about it, not about a search that happens to
 * contain it), `sel` opens its detail panel. Every other filter is dropped —
 * a funder filter from a project search means nothing on an organisation —
 * while the corpus is kept, because it is the lens the user chose, not a
 * filter they set for this particular search.
 *
 * One helper for all of them, so projects, organisations and (in a later
 * slice) works cannot drift into three slightly different link formats.
 */
export function buildEntityLink({
    entity,
    id,
    corpus,
    route = '/search',
}: {
    entity: string
    id: string
    corpus?: string
    route?: string
}): string {
    return buildSearchUrl({route, entity, only: id, selection: id, corpus})
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
