import {client, getDocument, indices, mgetDocuments, query} from '@heritagemonitor/search'
import {PROJECT_FACET_FIELDS, PROJECT_YEAR_HISTOGRAM, SEARCH_PAGE_SIZE, type SearchMode} from '@heritagemonitor/shared'
import {runSearch, type SearchExecution} from '../../common/search/runSearch.js'

// Repository layer: raw OpenSearch access only, no business logic (which sort
// a blank query gets, how a document becomes a DTO) — that lives in
// projects.service.ts. The bodies themselves come from @heritagemonitor/search's
// query package, the TypeScript port of hm_pipeline's export/queries.py, so
// this file only decides *which* body to run, never how to phrase it.

/**
 * The `projects` index document, exactly as hm_pipeline writes it (see
 * export/mappings/projects.json). Only the fields heritagemonitor reads are
 * modelled: `fundings` (an `enabled: false` blob) and `pillars` (the bitmask
 * behind `pillar_list`) are never fetched.
 */
export interface ProjectRawDoc {
    id: string
    openaireId?: string
    grantId?: string
    doi?: string
    title?: string
    acronym?: string
    summary?: string
    keywords?: string
    subjects?: string[]
    websiteUrl?: string
    callIdentifier?: string
    startDate?: string
    endDate?: string
    year?: number
    openAccessMandateForPublications?: boolean
    openAccessMandateForDataset?: boolean
    frameworkProgrammes?: string[]
    currency?: string
    funded_amount?: number
    funded_amount_eur?: number
    funded_eur_per_org?: number
    is_translated?: boolean
    is_ch?: boolean
    pred?: number
    minority_qids?: string[]
    pillar_list?: string[]
    theme?: string
    topic_id?: string
    subfield_id?: string
    field_id?: string
    domain_id?: string
    org_ids?: string[]
    org_names?: string[]
    org_regions?: string[]
    org_countries?: string[]
    coordinator_ids?: string[]
    org_count?: number
    work_count?: number
    funder?: string[]
    programme?: string[]
    funder_names?: string[]
    funding_stream_ids?: string[]
}

/** The `organisations` index document, limited to what a project's tab shows. */
export interface OrganisationRawDoc {
    id: string
    legalName?: string
    legalShortName?: string
    countryCode?: string
    region?: string
    rorTypes?: string[]
    rorId?: string
    websiteUrl?: string
    /** Only ~18% of project-connected organisations have one; fetched to say which. */
    geo?: unknown
    project_count?: number
    work_count?: number
    total_funding_eur?: number
}

const ORGANISATION_SOURCE = [
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
] as const

// What a result row shows (see ProjectRow in @heritagemonitor/shared). Fetching
// only these keeps a page of 20 from pulling 20 full summaries out of the
// stored fields — the per-hit fetch is the measured cost on the VM's HDD.
const ROW_SOURCE = [
    'id',
    'acronym',
    'title',
    'year',
    'funder',
    'programme',
    'funded_amount_eur',
    'is_ch',
    'org_count',
    'work_count',
    'topic_id',
    // Marks which project an organisation coordinates on its projects tab.
    'coordinator_ids',
    // Needed by projectLinks (DOI / CORDIS / OpenAIRE / website) for every
    // listed row, not only the selected one. All four are stored-only
    // (`index: false`) and short.
    'doi',
    'grantId',
    'openaireId',
    'websiteUrl',
] as const

/**
 * One aggregation per faceted field plus the year histogram, all in the same
 * request as the page itself — never a second round trip. `termsAgg` sets an
 * explicit shard_size (see its own doc comment on why the default makes counts
 * approximate).
 */
function facetAggs(): Record<string, unknown> {
    return {
        ...Object.fromEntries(PROJECT_FACET_FIELDS.map((facet) => [facet.field, query.termsAgg(facet.field, facet.size)])),
        [PROJECT_YEAR_HISTOGRAM]: query.histogramAgg('year', 1),
    }
}

export interface ProjectSearchParams {
    q: string
    page: number
    sort: query.ProjectSort
    filters: query.ProjectFilters
    /** Typo tolerance is only offered for a non-blank query — see the service. */
    typoTolerant: boolean
}

export async function search(params: ProjectSearchParams): Promise<SearchExecution<ProjectRawDoc>> {
    const {threshold, timeout} = query.TYPO_POLICY.projects
    const common = {q: params.q, sort: params.sort, filters: params.filters, aggs: facetAggs(), source: ROW_SOURCE}

    return runSearch<ProjectRawDoc>({
        index: indices.projectsIndexName,
        page: params.page,
        size: SEARCH_PAGE_SIZE,
        body: (window) => query.projectsBody({...common, from: window.from, size: window.size}),
        ...(params.typoTolerant
            ? {
                  fallback: {
                      threshold,
                      body: (window: query.PageWindow) =>
                          query.projectsBody({
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
        countBody: (mode: SearchMode) => query.projectsCountBody({q: params.q, filters: params.filters, mode}),
    })
}

/** The whole document for the detail panel, or null when the id does not exist. */
export async function getById(id: string): Promise<ProjectRawDoc | null> {
    return getDocument<ProjectRawDoc>(indices.projectsIndexName, id)
}

/** Row-shaped project documents for the ids given, in that order. */
export async function getProjectsByIds(ids: string[]): Promise<ProjectRawDoc[]> {
    return mgetDocuments<ProjectRawDoc>(indices.projectsIndexName, ids, ROW_SOURCE)
}

/** Full documents for one page of a project's `org_ids`, in the order given. */
export async function getOrganisations(ids: string[]): Promise<OrganisationRawDoc[]> {
    return mgetDocuments<OrganisationRawDoc>(indices.organisationsIndexName, ids, ORGANISATION_SOURCE)
}

export interface FacetValuesParams {
    field: string
    q: string
    size: number
    filters: query.ProjectFilters
    textQuery: string
}

/**
 * The values of one facet under the caller's current search, filtered by what
 * they are typing. `size: 0` — only the aggregation is wanted, never the hits.
 */
export async function facetValues(params: FacetValuesParams): Promise<query.TermsBucket[]> {
    const {body} = await client.search({
        index: indices.projectsIndexName,
        body: query.projectsBody({
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

export interface ProjectSuggestionDoc {
    id: string
    acronym?: string
    title?: string
    year?: number
    funder?: string[]
}

/** Type-ahead hits, ranked by the autocomplete body (acronym before title). */
export async function suggest(prefix: string, size: number): Promise<ProjectSuggestionDoc[]> {
    const {body} = await client.search({
        index: indices.projectsIndexName,
        body: query.projectAutocompleteBody(prefix, size),
    })
    const hits = body.hits.hits as unknown as Array<{_source?: ProjectSuggestionDoc}>
    return hits.map((hit) => hit._source).filter((doc): doc is ProjectSuggestionDoc => doc != null)
}
