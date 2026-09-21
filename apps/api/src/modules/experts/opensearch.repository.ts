import {indices, mgetDocuments, query} from '@heritagemonitor/search'
import {EXPERT_LIST_LIMIT, PROJECT_FACET_FIELDS, PROJECT_YEAR_HISTOGRAM} from '@heritagemonitor/shared'
import {runSearch, type SearchExecution} from '../../common/search/runSearch.js'
import type {OrganisationRawDoc} from '../organisations/opensearch.repository.js'

// Repository layer. Everything here happens in ONE request against the
// PROJECTS index: there is no experts index (D9), so the ranking is an
// aggregation over `org_ids` of whatever the user's project search matched.

/**
 * How precise the "how many organisations in total" number has to be.
 * `cardinality` is approximate by construction; 3,000 keeps it exact well past
 * the point where the answer stops being a number anyone reads.
 */
const ORG_CARDINALITY_PRECISION = 3_000

/**
 * The rollup fields the ranking and the rows need. Source-filtered, because
 * this is 200 documents fetched on every search and none of it needs the full
 * organisation record.
 *
 * SEAM: when the in-memory org table (plan F0-11) lands, this mget goes away
 * and these fields come from memory instead — the shape stays the same, so
 * only `fetchOrganisations` below changes.
 */
const ORG_SOURCE = [
    'id',
    'legalName',
    'legalShortName',
    'name_key',
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

interface CardinalityResult {
    value: number
}

export interface ExpertAggregations {
    orgs: query.TermsBucket[]
    /** Approximate number of DISTINCT organisations behind the matching projects. */
    organisationCount: number
    facets: Record<string, query.TermsAggregationResult>
}

/**
 * One `size: 0` request: the top organisations by matching projects, how many
 * distinct ones there are in total, and the same facets the projects page
 * shows — the filters here narrow projects, so their counts are projects'.
 */
function expertAggs(): Record<string, unknown> {
    return {
        orgs: query.termsAgg('org_ids', EXPERT_LIST_LIMIT, {order: {_count: 'desc'}}),
        organisationCount: {cardinality: {field: 'org_ids', precision_threshold: ORG_CARDINALITY_PRECISION}},
        ...Object.fromEntries(PROJECT_FACET_FIELDS.map((facet) => [facet.field, query.termsAgg(facet.field, facet.size)])),
        [PROJECT_YEAR_HISTOGRAM]: query.histogramAgg('year', 1),
    }
}

export interface ExpertSearchParams {
    q: string
    filters: query.ProjectFilters
    typoTolerant: boolean
}

/**
 * Runs the project search that the experts are derived from.
 *
 * Deliberately through the shared `runSearch`: the typo fallback, the
 * "did you mean" suggestions and the strict/fuzzy mode all have to behave
 * exactly as they do on the projects page, because it is the same query. The
 * page window it resolves is unused (the body asks for `size: 0`); what comes
 * back that matters is `total`, `mode`, `didYouMean` and the aggregations.
 */
export async function searchExpertProjects(params: ExpertSearchParams): Promise<SearchExecution<never>> {
    const {threshold, timeout} = query.TYPO_POLICY.projects
    const common = {q: params.q, filters: params.filters, aggs: expertAggs()}

    return runSearch<never>({
        index: indices.projectsIndexName,
        page: 1,
        body: () => query.projectsBody({...common, from: 0, size: 0}),
        ...(params.typoTolerant
            ? {
                  fallback: {
                      threshold,
                      body: () => query.projectsBody({...common, from: 0, size: 0, mode: 'fuzzy', suggest: true, timeout}),
                  },
              }
            : {}),
    })
}

export function readExpertAggregations(aggregations: Record<string, query.TermsAggregationResult>): ExpertAggregations {
    const orgs = aggregations.orgs?.buckets ?? []
    const cardinality = aggregations.organisationCount as unknown as CardinalityResult | undefined
    return {orgs, organisationCount: cardinality?.value ?? orgs.length, facets: aggregations}
}

/** The ranked organisations' own records, in one mget. See the SEAM note above. */
export async function fetchOrganisations(ids: string[]): Promise<OrganisationRawDoc[]> {
    return mgetDocuments<OrganisationRawDoc>(indices.organisationsIndexName, ids, ORG_SOURCE)
}
