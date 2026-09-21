import {getDocument, indices, query} from '@heritagemonitor/search'
import {PROJECT_FACET_FIELDS, SEARCH_PAGE_SIZE} from '@heritagemonitor/shared'
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
    // Needed by projectLinks (DOI / CORDIS / OpenAIRE / website) for every
    // listed row, not only the selected one. All four are stored-only
    // (`index: false`) and short.
    'doi',
    'grantId',
    'openaireId',
    'websiteUrl',
] as const

// One aggregation per faceted field, all in the same request as the page
// itself — never a second round trip. `termsAgg` sets an explicit shard_size
// (see its own doc comment on why the default makes counts approximate).
function facetAggs(): Record<string, unknown> {
    return Object.fromEntries(PROJECT_FACET_FIELDS.map((facet) => [facet.field, query.termsAgg(facet.field, facet.size)]))
}

export interface ProjectSearchParams {
    q: string
    page: number
    sort: query.ProjectSort
    filters: query.ProjectFilters
}

export async function search(params: ProjectSearchParams): Promise<SearchExecution<ProjectRawDoc>> {
    return runSearch<ProjectRawDoc>({
        index: indices.projectsIndexName,
        page: params.page,
        size: SEARCH_PAGE_SIZE,
        body: (window) =>
            query.projectsBody({
                q: params.q,
                from: window.from,
                size: window.size,
                sort: params.sort,
                filters: params.filters,
                aggs: facetAggs(),
                source: ROW_SOURCE,
            }),
    })
}

/** The whole document for the detail panel, or null when the id does not exist. */
export async function getById(id: string): Promise<ProjectRawDoc | null> {
    return getDocument<ProjectRawDoc>(indices.projectsIndexName, id)
}
