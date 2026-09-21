import {client, getDocument, indices, query} from '@heritagemonitor/search'
import {MINORITY_FACET_FIELDS, SEARCH_PAGE_SIZE, type SearchMode} from '@heritagemonitor/shared'
import {runSearch, type SearchExecution} from '../../common/search/runSearch.js'

// Repository layer: raw OpenSearch access only. Bodies come from
// @heritagemonitor/search's query package. See apps/api/RULES.md rule 3.

/**
 * The `minorities` index document. `project_title_blob` is indexed but
 * excluded from `_source` (it exists to be searched, never shown), so it is
 * deliberately not modelled here.
 */
export interface MinorityRawDoc {
    qid: string
    group_name_en: string
    countries?: string[]
    source_class?: string[]
    population?: number
    religions?: string[]
    native_languages?: string[]
    subclass_of?: string[]
    admin_territory?: string[]
    ancestral_home?: string[]
    known_subgroups?: Array<{name: string; qid: string}>
    search_keywords?: string[]
    has_subgroups?: boolean
    is_seed?: boolean
    project_count?: number
    dch_project_count?: number
    org_count?: number
    work_count?: number
    topic_ids?: string[]
    topic_counts?: Array<{topic_id: string; n: number}>
    merged_qids?: string[]
}

/**
 * Keyed by the LOGICAL field name so the response's facet keys match the
 * shared facet config, while the aggregation itself runs on the exact
 * sub-field where the index maps one (see `exactField`).
 */
function facetAggs(): Record<string, unknown> {
    return Object.fromEntries(
        MINORITY_FACET_FIELDS.map((facet) => [facet.field, query.termsAgg(query.exactField(facet.field), facet.size)]),
    )
}

export interface MinoritySearchParams {
    q: string
    page: number
    sort?: query.MinoritySort
    filters: query.MinorityFilters
    typoTolerant: boolean
    /** Groups found by the two-step project probe — see probeProjectsForQids. */
    boostQids: string[]
}

export async function search(params: MinoritySearchParams): Promise<SearchExecution<MinorityRawDoc>> {
    // 278 documents: the typo budget that matters here is the organisations
    // one (a name search), not the works one.
    const {threshold, timeout} = query.TYPO_POLICY.organisations
    const common = {
        q: params.q,
        sort: params.sort,
        filters: params.filters,
        aggs: facetAggs(),
        boostQids: params.boostQids,
    }

    return runSearch<MinorityRawDoc>({
        index: indices.minoritiesIndexName,
        page: params.page,
        size: SEARCH_PAGE_SIZE,
        body: (window) => query.minoritiesBody({...common, from: window.from, size: window.size}),
        ...(params.typoTolerant
            ? {
                  fallback: {
                      threshold,
                      body: (window: query.PageWindow) =>
                          query.minoritiesBody({...common, from: window.from, size: window.size, mode: 'fuzzy', suggest: true, timeout}),
                  },
              }
            : {}),
        countBody: (mode: SearchMode) => query.minoritiesCountBody({q: params.q, filters: params.filters, mode}),
    })
}

/**
 * Counts per topic for the GROUPS a search matches. The minorities index
 * stores leaf `topic_ids` only — no subfield or field column — so the caller
 * rolls these up to the higher levels itself.
 */
export async function topicCounts(q: string, filters: query.MinorityFilters, boostQids: string[]): Promise<query.TermsBucket[]> {
    const {body} = await client.search({
        index: indices.minoritiesIndexName,
        body: query.minoritiesBody({
            q,
            from: 0,
            size: 0,
            filters,
            boostQids,
            aggs: {topics: query.termsAgg('topic_ids', 5_000)},
        }),
    })
    const aggregations = body.aggregations as unknown as Record<string, query.TermsAggregationResult> | undefined
    return aggregations?.topics?.buckets ?? []
}

export async function getByQid(qid: string): Promise<MinorityRawDoc | null> {
    return getDocument<MinorityRawDoc>(indices.minoritiesIndexName, qid)
}

/**
 * Step one of the two-step search: the minority qids of the PROJECTS that
 * match this text. See `minorityProjectProbeBody` for why the group documents
 * alone are not enough.
 */
export async function probeProjectsForQids(q: string, size: number): Promise<string[]> {
    const {body} = await client.search({index: indices.projectsIndexName, body: query.minorityProjectProbeBody(q, size)})
    const aggregations = body.aggregations as unknown as Record<string, query.TermsAggregationResult> | undefined
    return (aggregations?.qids?.buckets ?? []).map((bucket) => String(bucket.key_as_string ?? bucket.key))
}

/** Organisations that worked on this group's projects, by number of projects. */
export async function organisationBuckets(qids: string[], size: number): Promise<query.TermsBucket[]> {
    const {body} = await client.search({index: indices.projectsIndexName, body: query.minorityOrganisationsBody(qids, size)})
    const aggregations = body.aggregations as unknown as Record<string, query.TermsAggregationResult> | undefined
    return aggregations?.orgs?.buckets ?? []
}

interface FunderBucket extends query.TermsBucket {
    programmes?: query.TermsAggregationResult
}

/** Funders behind this group's projects, each with its top programmes. */
export async function funderBuckets(qids: string[], size: number): Promise<FunderBucket[]> {
    const {body} = await client.search({index: indices.projectsIndexName, body: query.minorityFundingBody(qids, size)})
    const aggregations = body.aggregations as unknown as Record<string, {buckets: FunderBucket[]}> | undefined
    return aggregations?.funders?.buckets ?? []
}

export interface MinoritySuggestionDoc {
    qid: string
    group_name_en: string
    project_count?: number
}

export async function suggest(prefix: string, size: number): Promise<MinoritySuggestionDoc[]> {
    const {body} = await client.search({
        index: indices.minoritiesIndexName,
        body: query.minorityAutocompleteBody(prefix, size),
    })
    const hits = body.hits.hits as unknown as Array<{_source?: MinoritySuggestionDoc}>
    return hits.map((hit) => hit._source).filter((doc): doc is MinoritySuggestionDoc => doc != null)
}
