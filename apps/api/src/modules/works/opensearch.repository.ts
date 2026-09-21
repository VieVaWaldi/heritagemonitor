import {getDocument, indices, query} from '@heritagemonitor/search'
import {SEARCH_PAGE_SIZE, type SearchMode} from '@heritagemonitor/shared'
import {runSearch, type SearchExecution} from '../../common/search/runSearch.js'

// Repository layer: raw OpenSearch access only. See apps/api/RULES.md rule 3.
//
// There is no `facetAggs` here, unlike every other entity's repository. The
// works index is 50M documents on 4 shards with `best_compression`; a terms
// aggregation over that is a full scan, so this entity has no facets by
// design and its filter vocabularies are static constants in
// @heritagemonitor/shared instead.

/** The `works` index document (see export/mappings/works.json). */
export interface WorkRawDoc {
    id: string
    title?: string
    authors?: string[]
    author_count?: number
    publication_date?: string
    year?: number
    publisher?: string
    container_name?: string
    open_access_color?: string
    best_access_right?: string
    language?: string
    citation_count?: number
    doi?: string
    pdf_url?: string
    landing_url?: string
    project_ids?: string[]
    organisation_ids?: string[]
    org_count?: number
    link_tier?: number
    is_ch_via_project?: boolean
    minority_qids?: string[]
}

// A row plus the two link fields — `pdf_url`/`landing_url` are `index: false`
// but still stored, and the row's PDF/DOI button needs them. They cannot be
// filtered or `exists`-checked server-side, which is why "has a PDF" is not a
// filter anywhere.
const ROW_SOURCE = [
    'id',
    'title',
    'authors',
    'author_count',
    'year',
    'publisher',
    'container_name',
    'open_access_color',
    'citation_count',
    'doi',
    'pdf_url',
    'landing_url',
    'is_ch_via_project',
] as const

export interface WorkSearchParams {
    q: string
    page: number
    sort: query.WorkSort
    filters: query.WorkFilters
    typoTolerant: boolean
}

export async function search(params: WorkSearchParams): Promise<SearchExecution<WorkRawDoc>> {
    const {threshold, timeout} = query.TYPO_POLICY.works
    const common = {q: params.q, sort: params.sort, filters: params.filters, source: ROW_SOURCE}

    return runSearch<WorkRawDoc>({
        index: indices.worksIndexName,
        page: params.page,
        size: SEARCH_PAGE_SIZE,
        body: (window) => query.worksBody({...common, from: window.from, size: window.size}),
        ...(params.typoTolerant
            ? {
                  fallback: {
                      threshold,
                      body: (window: query.PageWindow) =>
                          query.worksBody({...common, from: window.from, size: window.size, mode: 'fuzzy', suggest: true, timeout}),
                  },
              }
            : {}),
        countBody: (mode: SearchMode) => query.worksCountBody({q: params.q, filters: params.filters, mode}),
    })
}

/**
 * One work by id. `client.get` addresses `_id`, which holds the same value as
 * the (unindexed) `id` field — a search on `id` would find nothing.
 */
export async function getById(id: string): Promise<WorkRawDoc | null> {
    return getDocument<WorkRawDoc>(indices.worksIndexName, id)
}
