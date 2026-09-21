import {client, query} from '@heritagemonitor/search'
import {MAX_PAGE, SEARCH_PAGE_SIZE, pageCountOf} from '@heritagemonitor/shared'
import {AppError} from '../../plugins/errors.js'

// The one place an entity search is actually executed. Every entity module's
// repository builds its body with the query package's pure builders and hands
// it here, so pagination, the 10,000-result window, the total/`totalCapped`
// convention and the aggregation shape are decided once instead of per
// module. Lives in common/ rather than a module because no module owns it —
// see apps/api/RULES.md rule 13.

export interface SearchExecution<TDocument> {
    /** `_source` of each hit, in ranking order. */
    documents: TDocument[]
    /** Exact up to 10,000; a floor beyond it — see `totalCapped`. */
    total: number
    totalCapped: boolean
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
}

interface SearchResponseBody<TDocument> {
    hits: {
        total: {value: number; relation?: string} | number
        hits: Array<{_id: string; _source?: TDocument}>
    }
    aggregations?: Record<string, query.TermsAggregationResult>
}

export async function runSearch<TDocument>({index, page, body, size = SEARCH_PAGE_SIZE}: RunSearchOptions): Promise<SearchExecution<TDocument>> {
    const window = query.pageWindow(page, size)
    // Deep pagination is bounded by the index's max_result_window, so a page
    // past it cannot be served at all — an explicit 400 ("refine your
    // search") is honest, an empty page would not be.
    if (!window) {
        throw new AppError(`Page ${page} is beyond the ${query.MAX_RESULT_WINDOW.toLocaleString('en-US')}-result window (last page: ${MAX_PAGE}). Refine your search instead.`, 400)
    }

    const {body: response} = await client.search({index, body: body(window)})
    // The client's generated types get `hits.hits`'s element type wrong (an
    // operator-precedence bug — see the health repository's note).
    const typed = response as unknown as SearchResponseBody<TDocument>

    const total = query.totalOf(typed)
    return {
        documents: typed.hits.hits.map((hit) => hit._source).filter((document): document is TDocument => document != null),
        total: total.value,
        totalCapped: total.capped,
        aggregations: typed.aggregations ?? {},
        page,
        pageCount: pageCountOf(total.value),
    }
}
