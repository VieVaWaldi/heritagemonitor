import {client, getDocument, indices, query} from '@heritagemonitor/search'
import {GRANT_FACET_FIELDS, SEARCH_PAGE_SIZE, type SearchMode} from '@heritagemonitor/shared'
import {runSearch, type SearchExecution} from '../../common/search/runSearch.js'

// Repository layer: raw OpenSearch access only. Bodies come from the query
// package — see apps/api/RULES.md rule 3.

/**
 * The `grants` index document (export/mappings/grants.json). Every field is
 * modelled: the index has eleven and the detail view shows all of them.
 */
export interface GrantRawDoc {
    id: string
    funder?: string
    funder_name?: string
    programme?: string
    action?: string
    description?: string
    jurisdiction?: string
    is_pseudo?: boolean
    project_count?: number
    dch_project_count?: number
    total_funded_eur?: number
}

function facetAggs(): Record<string, unknown> {
    return Object.fromEntries(GRANT_FACET_FIELDS.map((facet) => [facet.field, query.termsAgg(facet.field, facet.size)]))
}

export interface GrantSearchParams {
    q: string
    page: number
    sort?: query.GrantSort
    filters: query.GrantFilters
    typoTolerant: boolean
}

export async function search(params: GrantSearchParams): Promise<SearchExecution<GrantRawDoc>> {
    const {threshold, timeout} = query.TYPO_POLICY.grants
    const common = {q: params.q, sort: params.sort, filters: params.filters, aggs: facetAggs()}

    return runSearch<GrantRawDoc>({
        index: indices.grantsIndexName,
        page: params.page,
        size: SEARCH_PAGE_SIZE,
        body: (window) => query.grantsBody({...common, from: window.from, size: window.size}),
        ...(params.typoTolerant
            ? {
                  fallback: {
                      threshold,
                      body: (window: query.PageWindow) =>
                          query.grantsBody({...common, from: window.from, size: window.size, mode: 'fuzzy', suggest: true, timeout}),
                  },
              }
            : {}),
        countBody: (mode: SearchMode) => query.grantsCountBody({q: params.q, filters: params.filters, mode}),
    })
}

export async function getById(id: string): Promise<GrantRawDoc | null> {
    return getDocument<GrantRawDoc>(indices.grantsIndexName, id)
}

export async function suggest(prefix: string, size: number): Promise<GrantRawDoc[]> {
    const {body} = await client.search({
        index: indices.grantsIndexName,
        body: query.grantAutocompleteBody(prefix, size),
    })
    const hits = body.hits.hits as unknown as Array<{_source?: GrantRawDoc}>
    return hits.map((hit) => hit._source).filter((doc): doc is GrantRawDoc => doc != null)
}

export interface GrantFacetValuesParams {
    field: string
    q: string
    size: number
    filters: query.GrantFilters
    textQuery: string
}

/**
 * Values of one facet under the caller's current search — see the projects
 * module's twin.
 *
 * `funder` is the exception. Its buckets are codes, so the usual `include`
 * regexp would match what the user types against `EC` or `100010414` rather
 * than against "European Commission". For that field the text narrows the
 * DOCUMENTS by funder name instead, and the aggregation is a plain top-N: the
 * buckets that come back are the funders whose name matches, with their real
 * counts under the current filters.
 */
export async function facetValues(params: GrantFacetValuesParams): Promise<query.TermsBucket[]> {
    const byName = params.field === 'funder'
    const {body} = await client.search({
        index: indices.grantsIndexName,
        body: query.grantsBody({
            q: params.textQuery,
            from: 0,
            size: 0,
            filters: byName ? {...params.filters, funderName: params.q} : params.filters,
            aggs: {values: query.facetValuesAgg(params.field, {q: byName ? '' : params.q, size: params.size})},
        }),
    })
    const aggregations = body.aggregations as unknown as Record<string, query.TermsAggregationResult> | undefined
    return aggregations?.values?.buckets ?? []
}

/**
 * Readable names for a set of funder codes.
 *
 * `funder` is a code (`EC`, `NWO`) and `funder_name` is a separate text field,
 * so the facet's buckets are unreadable on their own. A terms agg on the codes
 * with a one-document sample per bucket is one cheap request over 6,119
 * documents — much less than fetching the streams themselves.
 */
export async function funderNames(codes: string[]): Promise<Map<string, string>> {
    if (codes.length === 0) return new Map()

    const {body} = await client.search({
        index: indices.grantsIndexName,
        body: {
            size: 0,
            query: {terms: {funder: codes}},
            aggs: {
                funders: {
                    terms: {field: 'funder', size: codes.length},
                    aggs: {sample: {top_hits: {size: 1, _source: ['funder_name']}}},
                },
            },
        },
    })

    const buckets =
        (
            body.aggregations as unknown as
                | {funders?: {buckets?: Array<{key: string; sample?: {hits?: {hits?: Array<{_source?: {funder_name?: string}}>}}}>}}
                | undefined
        )?.funders?.buckets ?? []

    return new Map(
        buckets
            .map((bucket): [string, string] => [bucket.key, bucket.sample?.hits?.hits?.[0]?._source?.funder_name ?? bucket.key])
            .filter(([, name]) => Boolean(name)),
    )
}
