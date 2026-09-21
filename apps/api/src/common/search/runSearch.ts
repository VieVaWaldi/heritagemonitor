import {client, query} from '@heritagemonitor/search'
import {MAX_PAGE, SEARCH_PAGE_SIZE, pageCountOf, type SearchMode} from '@heritagemonitor/shared'
import {AppError} from '../../plugins/errors.js'

// The one place an entity search is actually executed. Every entity module's
// repository builds its bodies with the query package's pure builders and
// hands them here, so pagination, the 10,000-result window, the total
// convention, the typo fallback and the approximate count are decided once
// instead of per module. Lives in common/ rather than a module because no
// module owns it — see apps/api/RULES.md rule 13.

/**
 * How long the parallel `_count` may take. It starts together with the main
 * search, so in practice it is finished before the search returns; this only
 * bounds the pathological case.
 */
const APPROX_COUNT_TIMEOUT_MS = 1_200

/**
 * How much longer than the main search the response may wait for that count.
 * An approximate total is a nicety — "10,000+" is already a correct answer —
 * so it never delays the results the user actually asked for.
 */
const APPROX_COUNT_GRACE_MS = 250

export interface SearchExecution<TDocument> {
    /** `_source` of each hit, in ranking order. */
    documents: TDocument[]
    /**
     * Every hit in ranking order with its `docvalue_fields`, for callers that
     * ask for `_source: false` (the query network scans 2,000 projects and
     * only wants two id lists from each).
     */
    hits: Array<{id: string; fields: Record<string, unknown[]>}>
    /** Exact up to 10,000; a floor beyond it — see `totalCapped`. */
    total: number
    totalCapped: boolean
    /**
     * What really matched, when `totalCapped` — from a separate `_count`,
     * which has no result window to respect. Null when the count was not
     * needed, timed out, or failed; the UI then falls back to "10,000+".
     */
    approxTotal: number | null
    mode: SearchMode
    didYouMean: string[]
    aggregations: Record<string, query.TermsAggregationResult>
    page: number
    pageCount: number
}

export interface RunSearchOptions {
    index: string
    /** 1-based. */
    page: number
    /**
     * Builds the request body for the resolved page window. Takes the window
     * rather than returning a bodyless query so a caller can never disagree
     * with the pagination decided here.
     */
    body: (window: query.PageWindow) => Record<string, unknown>
    size?: number
    /**
     * Typo tolerance: when the strict query returns fewer than `threshold`
     * hits, the search is re-run with this body (the caller builds it fuzzy,
     * with its own timeout and suggester). Omitted — as it must be for a blank
     * query — the search stays strict.
     */
    fallback?: {
        threshold: number
        body: (window: query.PageWindow) => Record<string, unknown>
    }
    /**
     * Query-only body for the `_count` that turns "10,000+" into a real
     * magnitude. Receives the mode that actually produced the results, so a
     * fuzzy rerun is counted as fuzzy rather than as a query nobody saw.
     */
    countBody?: (mode: SearchMode) => Record<string, unknown>
}

interface SearchResponseBody<TDocument> {
    hits: {
        total: {value: number; relation?: string} | number
        hits: Array<{_id: string; _source?: TDocument; fields?: Record<string, unknown[]>}>
    }
    aggregations?: Record<string, query.TermsAggregationResult>
    suggest?: unknown
}

export async function runSearch<TDocument>({
    index,
    page,
    body,
    size = SEARCH_PAGE_SIZE,
    fallback,
    countBody,
}: RunSearchOptions): Promise<SearchExecution<TDocument>> {
    const window = query.pageWindow(page, size)
    // Deep pagination is bounded by the index's max_result_window, so a page
    // past it cannot be served at all — an explicit 400 ("refine your
    // search") is honest, an empty page would not be.
    if (!window) {
        throw new AppError(
            `Page ${page} is beyond the ${query.MAX_RESULT_WINDOW.toLocaleString('en-US')}-result window (last page: ${MAX_PAGE}). Refine your search instead.`,
            400,
        )
    }

    // Started before the search is awaited so the two run together: on the
    // strict path the count is effectively free, because it finishes while
    // OpenSearch is still fetching and aggregating the page.
    const strictCount = countBody ? startCount(index, countBody('strict')) : null

    let response = await execute<TDocument>(index, body(window))
    let total = query.totalOf(response)
    let mode: SearchMode = 'strict'
    let didYouMean: string[] = []

    if (fallback && total.value < fallback.threshold) {
        const fuzzy = await execute<TDocument>(index, fallback.body(window))
        const fuzzyTotal = query.totalOf(fuzzy)
        // Switch only if the rerun actually found more: a fuzzy query that
        // finds nothing either must not relabel an empty result as "showing
        // results for something else".
        if (fuzzyTotal.value > total.value) {
            response = fuzzy
            total = fuzzyTotal
            mode = 'fuzzy'
        }
        // The suggestions are worth showing even when the rerun did not win —
        // that is exactly the case where the user needs a spelling hint.
        didYouMean = query.readDidYouMean(fuzzy.suggest)
    }

    let approxTotal: number | null = null
    if (total.capped && countBody) {
        approxTotal =
            mode === 'strict'
                ? await withGrace(strictCount, APPROX_COUNT_GRACE_MS)
                : // The fuzzy path could not be foreseen when the strict count
                  // started, so its count begins here and gets the full budget.
                  await withGrace(startCount(index, countBody('fuzzy')), APPROX_COUNT_TIMEOUT_MS)
    }

    return {
        documents: response.hits.hits.map((hit) => hit._source).filter((document): document is TDocument => document != null),
        hits: response.hits.hits.map((hit) => ({id: hit._id, fields: hit.fields ?? {}})),
        total: total.value,
        totalCapped: total.capped,
        approxTotal,
        mode,
        didYouMean,
        aggregations: response.aggregations ?? {},
        page,
        pageCount: pageCountOf(total.value),
    }
}

async function execute<TDocument>(index: string, body: Record<string, unknown>): Promise<SearchResponseBody<TDocument>> {
    const {body: response} = await client.search({index, body})
    // The client's generated types get `hits.hits`'s element type wrong (an
    // operator-precedence bug — see the health repository's note).
    return response as unknown as SearchResponseBody<TDocument>
}

/**
 * `_count` never throws out of here: the exact total is optional, and failing
 * a search because its nice-to-have number was slow would be absurd. The
 * returned promise is always handled, so an ignored count cannot surface as
 * an unhandled rejection either.
 */
function startCount(index: string, body: Record<string, unknown>): Promise<number | null> {
    return client
        .count({index, body}, {requestTimeout: APPROX_COUNT_TIMEOUT_MS})
        .then(({body: response}) => (typeof response.count === 'number' ? response.count : null))
        .catch(() => null)
}

function withGrace(pending: Promise<number | null> | null, graceMs: number): Promise<number | null> {
    if (!pending) return Promise.resolve(null)
    return Promise.race([
        pending,
        new Promise<number | null>((resolve) => {
            const timer = setTimeout(() => resolve(null), graceMs)
            // Nothing should keep the process alive for a number no one is
            // waiting on any more.
            timer.unref?.()
        }),
    ])
}
