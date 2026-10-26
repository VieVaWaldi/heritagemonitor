import {z} from 'zod'

// Conventions every entity search (projects, organisations, works, grants,
// minorities) shares: the corpus selector, the pagination arithmetic and the
// response envelope. Entity-specific request/row schemas live in that
// entity's own file (see ./projects.ts) and only compose what's here, so the
// envelope shape is defined once rather than per entity.

// --- corpus -----------------------------------------------------------------

// SCI/DCH. Mapped to a different index field per entity (projects `is_ch`,
// organisations `has_dch_project`, works `is_ch_via_project`, ...) — that
// mapping is apps/api's business, the wire only carries the choice itself.
export const CORPUS_KEYS = ['science', 'dch'] as const
export const corpusSchema = z.enum(CORPUS_KEYS)
export type Corpus = z.infer<typeof corpusSchema>
export const DEFAULT_CORPUS: Corpus = 'science'

// --- pagination -------------------------------------------------------------

// One page of results, everywhere. PaginatedList shows exactly this many rows.
export const SEARCH_PAGE_SIZE = 20

// OpenSearch refuses `from + size` beyond its index.max_result_window (10,000,
// see packages/search/src/query/pagination.ts, which owns that number as an
// index fact). 10,000 / 20 is the last page a client may ask for; anything
// beyond is a 400 from the api, not an empty page.
export const MAX_PAGE = 500

export const pageSchema = z.coerce.number().int().min(1).max(MAX_PAGE)

// The page count a client may paginate through — never more than MAX_PAGE,
// however many documents actually matched.
export function pageCountOf(estimatedTotalHits: number): number {
    return Math.min(Math.max(1, Math.ceil(estimatedTotalHits / SEARCH_PAGE_SIZE)), MAX_PAGE)
}

// --- facets -----------------------------------------------------------------

// One entry per faceted field: value -> document count. Values are raw index
// values (a topic id, a funder code); `facetLabels` below carries the display
// name where the raw value isn't one.
export const facetDistributionSchema = z.record(z.string(), z.record(z.string(), z.number()))
export type FacetDistribution = z.infer<typeof facetDistributionSchema>

// field -> value -> label. Only present for fields whose raw values are ids
// (today: `topic_id`, resolved from the api's in-memory topics table). A value
// missing from here is displayed as-is.
export const facetLabelsSchema = z.record(z.string(), z.record(z.string(), z.string()))
export type FacetLabels = z.infer<typeof facetLabelsSchema>

// --- envelope ---------------------------------------------------------------

/**
 * The response shape of every `GET /v1/<entity>/search`, parameterised by the
 * entity's own row schema.
 *
 * `estimatedTotalHits` is exact up to 10,000 and a floor beyond it —
 * `totalCapped` says which, because counting exactly over 50M works is the
 * expensive part of the query (OpenSearch `track_total_hits: 10000`). The UI
 * renders a capped total as "10,000+", never as a precise number it isn't.
 */
export function searchResponseSchema<THit extends z.ZodType>(hitSchema: THit) {
    return paginatedResponseSchema(hitSchema).extend({
        facetDistribution: facetDistributionSchema,
        facetLabels: facetLabelsSchema,
        totalCapped: z.boolean(),
        /**
         * The real number of matches when `totalCapped`, from a separate
         * `_count` the api runs alongside the search. Null when it was not
         * needed or did not come back in time — the UI then says "10,000+"
         * rather than guessing.
         */
        approxTotal: z.number().nullable(),
        /**
         * `fuzzy` means the strict query found almost nothing and the api
         * re-ran it with typo tolerance — the UI has to say so, because the
         * results are then answers to a question the user did not quite ask.
         */
        mode: searchModeSchema,
        /**
         * Spelling suggestions from the index's own terms, only ever present
         * alongside `mode: 'fuzzy'`. Empty when the term suggester had nothing
         * better to offer.
         */
        didYouMean: z.array(z.string()),
    })
}

/**
 * A plain page of rows with no query behind it — a project's organisations,
 * a minority's subgroups. Same page/pageCount arithmetic as a search, without
 * the facets, the total cap or the ranking mode, none of which mean anything
 * when the result set is a known list.
 */
export function paginatedResponseSchema<THit extends z.ZodType>(hitSchema: THit) {
    return z.object({
        hits: z.array(hitSchema),
        estimatedTotalHits: z.number(),
        page: z.number(),
        pageCount: z.number(),
    })
}

export const searchModeSchema = z.enum(['strict', 'fuzzy'])
export type SearchMode = z.infer<typeof searchModeSchema>

// --- autocomplete -----------------------------------------------------------

/**
 * One type-ahead suggestion. `id` is present when picking the suggestion can
 * open a specific document (a project, an organisation) rather than only
 * filling the search box; `hint` is the secondary line (a country, a year).
 */
export const entitySuggestionSchema = z.object({
    label: z.string(),
    id: z.string().optional(),
    hint: z.string().optional(),
})
export type EntitySuggestion = z.infer<typeof entitySuggestionSchema>

export const entitySuggestResponseSchema = z.object({
    suggestions: z.array(entitySuggestionSchema),
})
export type EntitySuggestResponse = z.infer<typeof entitySuggestResponseSchema>

/**
 * What one faceted field needs, for any entity: the index field to aggregate,
 * the URL param that filters on it, the label to show, how many buckets to
 * ask for, and whether its values are too many to ship whole (then the UI
 * uses the facet-values type-ahead instead of a checkbox list).
 *
 * Each entity declares its own `as const` list; this type is what lets the
 * web's facet shaping and filter UI be written once for all of them.
 */
export interface FacetConfig {
    readonly field: string
    readonly param: string
    readonly label: string
    readonly size: number
    readonly searchable: boolean
}

// --- facet value type-ahead -------------------------------------------------

/**
 * One value of a faceted field, with the count it has under the request's
 * current query and filters. Same shape the UI's filter options use.
 */
export const facetValueSchema = z.object({
    value: z.string(),
    label: z.string(),
    count: z.number(),
})
export type FacetValue = z.infer<typeof facetValueSchema>

export const facetValuesResponseSchema = z.object({
    /** The URL param this list belongs to, echoed so a late response can be matched up. */
    field: z.string(),
    values: z.array(facetValueSchema),
})
export type FacetValuesResponse = z.infer<typeof facetValuesResponseSchema>

// --- year range -------------------------------------------------------------

/**
 * The years a filter may ask for. The index stores `year` as NULL outside
 * 1950..2040; the UI bound is narrower at the bottom (nothing useful before
 * 1980) and allows a few years ahead, because projects are registered with
 * future start dates.
 */
export const MIN_FILTER_YEAR = 1980
export const FUTURE_YEARS_ALLOWED = 3

export function maxFilterYear(today: Date = new Date()): number {
    return today.getUTCFullYear() + FUTURE_YEARS_ALLOWED
}

export const yearRangeSchema = z
    .object({from: z.number().int(), to: z.number().int()})
    .refine((range) => range.from <= range.to, {message: 'years: from must not be after to'})
export type YearRange = z.infer<typeof yearRangeSchema>

/**
 * `years=2019-2025` on the wire — one param, so a range is atomic in the URL
 * and in the api's querystring (two params could arrive half-updated).
 */
export function formatYearRange(range: YearRange): string {
    return `${range.from}-${range.to}`
}

/** Parses `2019-2025`, clamping to the allowed window; anything else is "no year filter". */
export function parseYearRange(value: string | null | undefined, today: Date = new Date()): YearRange | null {
    const match = /^(\d{4})-(\d{4})$/.exec((value ?? '').trim())
    if (!match) return null

    const min = MIN_FILTER_YEAR
    const max = maxFilterYear(today)
    const from = Math.min(Math.max(Number(match[1]), min), max)
    const to = Math.min(Math.max(Number(match[2]), min), max)
    return from <= to ? {from, to} : null
}

// --- topics -----------------------------------------------------------------

/**
 * How many topic-tree nodes may be selected at once, across all three levels
 * together. A cap exists because each selected value becomes a URL param and
 * a `terms` value; 20 matches MAX_URL_TOPICS in the previous app.
 */
export const MAX_URL_TOPICS = 20

// The request params every entity search accepts. Entity schemas extend this
// with their own sort values and filters. Names are deliberately identical to
// the web's URL params (apps/web/src/common/url) — the search hook forwards
// the URL's params to the api unchanged, so there is no mapping layer to keep
// in sync.
export const baseSearchRequestSchema = z.object({
    q: z.string().optional(),
    c: corpusSchema.optional(),
    page: pageSchema.optional(),
    /** Deep link: restrict the list to these document ids. */
    only: z.array(z.string()).optional(),
    /**
     * `true` = the STRICT search only: no typo-tolerant rerun. The main lists
     * leave it out and keep their "close matches" fallback; a list that hangs
     * off a parent count (an expert's matching projects, a stream's projects)
     * sends it, because narrowing by the parent drops the strict total below
     * the fallback threshold and the list would silently become a looser
     * search than the number it belongs to.
     */
    strict: z.enum(['true']).optional(),
})
export type BaseSearchRequest = z.infer<typeof baseSearchRequestSchema>
