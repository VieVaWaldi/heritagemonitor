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
    /** Grants facet: the country (or `EU`) whose money a funding stream is. */
    jurisdiction: 'jurisdiction',
    /**
     * Funding-stream ids (`funder::programme[::action]`). Not a facet anywhere
     * — it is how a funding stream's own projects are asked for, from the
     * grants entity's Projects tab and from a link into the projects list.
     */
    stream: 'stream',
    region: 'region',
    /**
     * Detail-panel toggle: show ALL of the open organisation's works
     * rather than only those matching the search text. Tab-level, so it never
     * touches the page's own `q`.
     */
    allWorks: 'allWorks',
    /** Funding: only organisations that can be drawn on the map. */
    hasGeo: 'hasGeo',
    /**
     * Experts and funding: rank organisations by the projects they COORDINATE
     * (`coordinator_ids`), not all they took part in. EC projects only.
     */
    coordinators: 'coordinators',
    /** Funding: ROR institution type of the organisation. */
    orgType: 'orgType',
    /** Organisation country code — a facet on the organisations and funding pages. */
    country: 'country',
    /**
     * Organisation network: the organisation in the middle of the map (its
     * id, as suggested by the organisations autocomplete). `sel` is then the
     * selected partner. Never sent to the api as a search param.
     */
    center: 'center',
    /**
     * Projects involving EVERY listed organisation (the shared projects of a
     * pair) — the projects list's all-of counterpart of `org`.
     */
    orgAll: 'orgAll',
    /** Map camera: `lat,lng,zoom` at 4 decimals. See readMapView. */
    view: 'view',
    /** Which visualization is showing: `network` (force graph) or `arcs` (geographic) on the query network. */
    layer: 'layer',
    /** Query network: how many of the strongest collaborations are kept (10-300). */
    maxEdges: 'maxEdges',
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
    SEARCH_PARAM.allWorks,
    // The map camera and the chosen layer describe what the user is LOOKING
    // AT, not what was searched for. Leaving them in was a real bug: they
    // became part of every fetch key, so panning the funding map aborted and
    // refired its 500-organisation request on each frame, and the map could
    // end up showing a payload from a different filter state than the list
    // beside it.
    SEARCH_PARAM.view,
    SEARCH_PARAM.layer,
    // How many edges the query network keeps is the network endpoint's own
    // param; the projects endpoints never see it.
    SEARCH_PARAM.maxEdges,
    // The organisation network's own centre; the projects endpoints never
    // see it (the network request is built from `center` explicitly).
    SEARCH_PARAM.center,
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
    SEARCH_PARAM.allWorks,
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
 * The query network's edge cap: an integer within [min, max], anything else
 * falls back to the default. Clamped rather than rejected — a hand-edited
 * `maxEdges=99999` is a request for "as many as allowed".
 */
export function readMaxEdges(params: URLSearchParams, bounds: {min: number; max: number; fallback: number}): number {
    const raw = Number(params.get(SEARCH_PARAM.maxEdges))
    if (!params.get(SEARCH_PARAM.maxEdges) || !Number.isFinite(raw)) return bounds.fallback
    return Math.min(bounds.max, Math.max(bounds.min, Math.round(raw)))
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
 * Params whose change drops the open row.
 *
 * Deliberately SHORT. Narrowing a facet used to clear the selection too, which
 * meant the thing you were reading vanished the moment you tried to narrow the
 * list around it — the single most annoying behaviour on these pages, because
 * filtering is exactly when you want to keep your place.
 *
 * These three genuinely invalidate it:
 *  - `page`: the row is not on screen any more.
 *  - `q`: a different search is a different subject; keeping the old row next
 *    to new results reads as a bug.
 *  - `c` (corpus): the row may not exist in the other corpus at all.
 *
 * A facet change keeps the selection, and the panel checks cheaply whether the
 * row still matches (see useSelectionSurvival) — falling back to the first row
 * only when it genuinely dropped out.
 */
export const SELECTION_CLEARING_PARAMS: ReadonlySet<string> = new Set([
    SEARCH_PARAM.page,
    SEARCH_PARAM.query,
    SEARCH_PARAM.corpus,
    // A new centre is a new network: the selected partner belongs to the old one.
    SEARCH_PARAM.center,
])

/**
 * True when a patch invalidates the open detail panel.
 *
 * The one exception is a patch that sets `sel` ITSELF: a deep link
 * (`?only=…&sel=…`) or a row click arrives as one patch that changes both, and
 * there the explicit selection must win.
 */
export function patchClearsSelection(patch: UrlPatch): boolean {
    if (patch[SEARCH_PARAM.selection] !== undefined) return false
    return Object.entries(patch).some(([name, value]) => value !== undefined && SELECTION_CLEARING_PARAMS.has(name))
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

// --- map view ---------------------------------------------------------------

/**
 * The map camera as one `view=lat,lng,zoom` param, in the format the old app
 * used so its links keep working.
 *
 * One param rather than three because a camera is one thing: three separate
 * params can arrive half-updated mid-pan and put the map somewhere neither
 * the user nor the link meant. Four decimals is ~11 m — past what any zoom
 * level here can show, and short enough to keep the URL readable.
 *
 * Anything unparseable returns null and the map falls back to its own default,
 * because the value comes from a URL a user may have edited by hand.
 */
export interface MapView {
    latitude: number
    longitude: number
    zoom: number
}

const VIEW_DECIMALS = 4

export function readMapView(params: URLSearchParams): MapView | null {
    const raw = params.get(SEARCH_PARAM.view)
    if (!raw) return null

    const parts = raw.split(',')
    if (parts.length !== 3) return null

    const [latitude, longitude, zoom] = parts.map(Number)
    // All three valid or the whole thing is dropped — a camera with a good
    // latitude and a NaN zoom is not a usable camera.
    if (![latitude, longitude, zoom].every(Number.isFinite)) return null
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || zoom < 0 || zoom > 24) return null

    return {latitude, longitude, zoom}
}

export function mapViewPatchValue(view: MapView | null): string | null {
    if (!view) return null
    const {latitude, longitude, zoom} = view
    return [latitude, longitude, zoom].map((value) => value.toFixed(VIEW_DECIMALS)).join(',')
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

/**
 * The patch behind "reset": everything the user narrowed with goes, and only
 * the LENS they are looking through stays.
 *
 * Built by clearing every param actually present rather than from a list of
 * filters, so a filter added later is reset without anyone remembering to add
 * it here — the same reasoning as URL_PARAM_LABELS. `keep` is normally the
 * entity and the corpus: which things you are looking at, and which half of
 * the corpus, are not things "reset filters" should undo.
 *
 * `q` IS cleared: a reset that leaves the search text behind resets nothing
 * the user can see. The search box follows, because its draft re-syncs from
 * the URL whenever the change did not come from the box itself (see
 * useUrlQueryDraft).
 */
export function buildResetPatch(params: URLSearchParams, keep: readonly string[]): UrlPatch {
    const kept = new Set(keep)
    return Object.fromEntries([...new Set(params.keys())].filter((name) => !kept.has(name)).map((name) => [name, null]))
}

/**
 * Whether the reset button has anything to undo: an active filter, OR search
 * text on its own. The text is cleared by reset (buildResetPatch), so a page
 * with only a query and no facet is still resettable — checking the facets
 * alone left the button greyed out while the search box held a value.
 */
export function canReset(filtersActive: boolean, params: URLSearchParams): boolean {
    return filtersActive || (params.get(SEARCH_PARAM.query) ?? '').trim() !== ''
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
    [SEARCH_PARAM.allWorks]: 'Showing all works (not only matching)',
    [SEARCH_PARAM.hasGeo]: 'Only organisations with coordinates',
    [SEARCH_PARAM.maxEdges]: 'Query network: how many of the strongest collaborations are shown (10-300, default 100)',
    [SEARCH_PARAM.center]: 'Organisation in the middle of the collaboration network (its id; sel = the selected partner)',
    [SEARCH_PARAM.orgAll]: 'Only projects shared by ALL of these organisation ids',
    [SEARCH_PARAM.coordinators]: 'Only organisations coordinating the projects (EC projects only; ranks by coordinated projects)',
    [SEARCH_PARAM.orgType]: 'Organisation type',
    [SEARCH_PARAM.country]: 'Country',
    [SEARCH_PARAM.view]: 'Map view (lat, lng, zoom)',
    [SEARCH_PARAM.layer]: 'Map layer',
    [SEARCH_PARAM.years]: 'Years',
    [SEARCH_PARAM.theme]: 'Theme',
    [SEARCH_PARAM.pillar]: 'Pillar',
    [SEARCH_PARAM.funder]: 'Funder',
    [SEARCH_PARAM.programme]: 'Programme',
    [SEARCH_PARAM.jurisdiction]: 'Jurisdiction',
    [SEARCH_PARAM.stream]: 'Funding stream',
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
    /** Restrict the destination list to one funding stream's projects. */
    stream?: string
    /** Organisation network: the organisation to centre it on. */
    center?: string
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
 * The patch behind picking an autocomplete suggestion on a page that is
 * already open: the same result as following `buildEntityLink` — the list
 * restricted to that one document (`only`), its detail open (`sel`) — applied
 * in place. Everything else the user had narrowed with (text, facets, page,
 * sort) goes, exactly as in the link form, because a facet left on could hide
 * the very document just picked. The entity and the corpus are the lens and
 * stay.
 */
export function buildFocusPatch(params: URLSearchParams, id: string, focus: SuggestionFocus = 'only'): UrlPatch {
    const reset = buildResetPatch(params, [SEARCH_PARAM.entity, SEARCH_PARAM.corpus])
    // The organisation network has no restricted list: the picked organisation
    // becomes the CENTRE and is selected in the list of its own network.
    if (focus === 'center') return {...reset, [SEARCH_PARAM.center]: id, [SEARCH_PARAM.selection]: id}
    return {...reset, [SEARCH_PARAM.only]: id, [SEARCH_PARAM.selection]: id}
}

/**
 * What picking an autocomplete suggestion does on a route: `only` narrows the
 * list to that document (every entity list); `center` makes it the centre of

 * the organisation network; `query` searches the picked suggestion's text (the
 * query network, whose page is a text search, not a list of one document).
 * Declared per UseCase action (common/catalog).
 */
export type SuggestionFocus = 'only' | 'center' | 'query'

/** The link the landing page follows for a picked suggestion, on the action's route. */
export function buildSuggestionLink({
    route,
    entity,
    id,
    corpus,
    focus = 'only',
}: {
    route: string
    entity: string
    id: string
    corpus?: string
    focus?: SuggestionFocus
}): string {
    if (focus === 'center') return buildSearchUrl({route, entity, corpus, center: id, selection: id})
    return buildEntityLink({entity, id, corpus, route})
}

/**
 * The one builder for a link from one route to another (a project's
 * organisation row -> `/search?e=organisations&only=<id>&sel=<id>&c=dch`).
 * Built on the same param names and the same writer as every in-page update,
 * so a link can never produce a URL the reading side does not understand.
 */
export function buildSearchUrl({route, query, entity, corpus, only, selection, tab, stream, center}: SearchUrlParams): string {
    const params = applyPatch(new URLSearchParams(), {
        [SEARCH_PARAM.query]: query ?? null,
        [SEARCH_PARAM.entity]: entity ?? null,
        [SEARCH_PARAM.corpus]: corpus ?? null,
        [SEARCH_PARAM.only]: only ?? null,
        [SEARCH_PARAM.selection]: selection ?? null,
        [SEARCH_PARAM.tab]: tab ?? null,
        [SEARCH_PARAM.stream]: stream ?? null,
        [SEARCH_PARAM.center]: center ?? null,
    })
    const queryString = params.toString()
    return queryString ? `${route}?${queryString}` : route
}
