import {client, getDocument, indices, query} from '@heritagemonitor/search'
import {ORGANISATION_FACET_FIELDS, SEARCH_PAGE_SIZE, type SearchMode} from '@heritagemonitor/shared'
import {runSearch, type SearchExecution} from '../../common/search/runSearch.js'

// Repository layer: raw OpenSearch access only. The bodies come from
// @heritagemonitor/search's query package (the port of export/queries.py), so
// this file only decides which body to run — see apps/api/RULES.md rule 3.

/**
 * The `organisations` index document (see
 * export/mappings/organisations.json). `pids`, `rorLocations` and
 * `rorRelationships` exist on the index but nothing reads them yet, so they
 * are not modelled.
 */
export interface OrganisationRawDoc {
    id: string
    openaireId?: string
    legalName?: string
    legalShortName?: string
    alternativeNames?: string[]
    websiteUrl?: string
    countryCode?: string
    rorId?: string
    wikiId?: string
    rorStatus?: string
    rorEstablished?: number
    rorTypes?: string[]
    geo?: unknown
    geolocation_source?: string
    address_street?: string
    address_postalcode?: string
    address_city?: string
    address_country?: string
    nuts3?: string
    region?: string
    name_key?: string
    project_count?: number
    work_count?: number
    dch_project_count?: number
    has_dch_project?: boolean
    total_funding_eur?: number
}

// What a result row shows (OrganisationRow in @heritagemonitor/shared), plus
// `geo` — not to draw anything, only to say whether the organisation COULD be
// drawn. Fetching a subset keeps a page of 20 off the full documents.
const ROW_SOURCE = [
    'id',
    'legalName',
    'legalShortName',
    'countryCode',
    'region',
    'rorTypes',
    'rorId',
    'websiteUrl',
    'geo',
    'project_count',
    'work_count',
    'total_funding_eur',
    'has_dch_project',
] as const

function facetAggs(): Record<string, unknown> {
    return Object.fromEntries(ORGANISATION_FACET_FIELDS.map((facet) => [facet.field, query.termsAgg(facet.field, facet.size)]))
}

export interface OrganisationSearchParams {
    q: string
    page: number
    sort?: query.OrganisationSort
    filters: query.OrganisationFilters
    typoTolerant: boolean
}

export async function search(params: OrganisationSearchParams): Promise<SearchExecution<OrganisationRawDoc>> {
    const {threshold, timeout} = query.TYPO_POLICY.organisations
    const common = {q: params.q, sort: params.sort, filters: params.filters, aggs: facetAggs(), source: ROW_SOURCE}

    return runSearch<OrganisationRawDoc>({
        index: indices.organisationsIndexName,
        page: params.page,
        size: SEARCH_PAGE_SIZE,
        body: (window) => query.organisationsBody({...common, from: window.from, size: window.size}),
        ...(params.typoTolerant
            ? {
                  fallback: {
                      threshold,
                      body: (window: query.PageWindow) =>
                          query.organisationsBody({
                              ...common,
                              from: window.from,
                              size: window.size,
                              mode: 'fuzzy',
                              suggest: true,
                              timeout,
                          }),
                  },
              }
            : {}),
        countBody: (mode: SearchMode) => query.organisationsCountBody({q: params.q, filters: params.filters, mode}),
    })
}

export async function getById(id: string): Promise<OrganisationRawDoc | null> {
    return getDocument<OrganisationRawDoc>(indices.organisationsIndexName, id)
}

export interface OrganisationSuggestionDoc {
    id: string
    legalName?: string
    legalShortName?: string
    countryCode?: string
    project_count?: number
    name_key?: string
}

export async function suggest(prefix: string, size: number): Promise<OrganisationSuggestionDoc[]> {
    const {body} = await client.search({
        index: indices.organisationsIndexName,
        body: query.organisationAutocompleteBody(prefix, size),
    })
    const hits = body.hits.hits as unknown as Array<{_source?: OrganisationSuggestionDoc}>
    return hits.map((hit) => hit._source).filter((doc): doc is OrganisationSuggestionDoc => doc != null)
}

export interface OrganisationFacetValuesParams {
    field: string
    q: string
    size: number
    filters: query.OrganisationFilters
    textQuery: string
}

/** Values of one facet under the caller's current search — see the projects module's twin. */
export async function facetValues(params: OrganisationFacetValuesParams): Promise<query.TermsBucket[]> {
    const {body} = await client.search({
        index: indices.organisationsIndexName,
        body: query.organisationsBody({
            q: params.textQuery,
            from: 0,
            size: 0,
            filters: params.filters,
            aggs: {values: query.facetValuesAgg(params.field, {q: params.q, size: params.size})},
        }),
    })
    const aggregations = body.aggregations as unknown as Record<string, query.TermsAggregationResult> | undefined
    return aggregations?.values?.buckets ?? []
}
