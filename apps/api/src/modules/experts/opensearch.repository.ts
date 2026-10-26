import {indices, mgetDocuments, query} from '@heritagemonitor/search'
import {EXPERT_LIST_LIMIT, PROJECT_FACET_FIELDS, PROJECT_YEAR_HISTOGRAM} from '@heritagemonitor/shared'
import {runSearch, type SearchExecution} from '../../common/search/runSearch.js'
import {getOrganisations, isOrganisationTableReady} from '../../reference/organisationTable.js'
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
 * The fields a DISPLAYED row needs. Source-filtered: none of this needs the
 * full organisation record.
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
export function expertAggs(coordinatorsOnly: boolean): Record<string, unknown> {
    // Coordinators-only swaps the aggregated field, nothing else: the buckets
    // are still organisation ids counted in matching projects, so the merge,
    // sorting and paging downstream do not know the difference. A project
    // with no coordinator (everything outside the EC) has no value in
    // `coordinator_ids` and so simply does not count.
    const field = coordinatorsOnly ? 'coordinator_ids' : 'org_ids'
    return {
        orgs: query.termsAgg(field, EXPERT_LIST_LIMIT, {order: {_count: 'desc'}}),
        organisationCount: {cardinality: {field, precision_threshold: ORG_CARDINALITY_PRECISION}},
        ...Object.fromEntries(PROJECT_FACET_FIELDS.map((facet) => [facet.field, query.termsAgg(facet.field, facet.size)])),
        [PROJECT_YEAR_HISTOGRAM]: query.histogramAgg('year', 1),
    }
}

export interface ExpertSearchParams {
    q: string
    filters: query.ProjectFilters
    typoTolerant: boolean
    /** Rank by coordinated projects only — see expertSearchRequestSchema. */
    coordinatorsOnly: boolean
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
    const common = {q: params.q, filters: params.filters, aggs: expertAggs(params.coordinatorsOnly)}

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

/**
 * What ranking an organisation needs to know about it: which institution it
 * merges into (D19) and its own lifetime figures, which are the non-default
 * sort keys.
 */
export interface OrganisationRankingKeys {
    /** Ids sharing this are the same institution. `null` means the row is only ever itself. */
    group: string | null
    funding: number
    projectCount: number
    workCount: number
}

export interface RankedOrganisations {
    /** Keyed by organisation id; an id missing here has no record and cannot be shown. */
    keys: Map<string, OrganisationRankingKeys>
    /**
     * Full documents, when they were fetched anyway. Empty when the keys came
     * from memory — the caller then fetches only the page it is about to show.
     */
    documents: Map<string, OrganisationRawDoc>
}

function keysFromDocument(document: OrganisationRawDoc): OrganisationRankingKeys {
    return {
        group: document.name_key ?? null,
        funding: document.total_funding_eur ?? 0,
        projectCount: document.project_count ?? 0,
        workCount: document.work_count ?? 0,
    }
}

/**
 * Ranking keys for the WHOLE ranked set (up to 200 ids), because the merge has
 * to see every name key before it can know what page 1 contains.
 *
 * Served from the in-memory organisation table (plan F0-11) when it has
 * finished loading, which is the point of the table: this used to be an mget
 * of 200 documents on every single search, and on the VM's cold cache an mget
 * of that size cost seconds. Until it is ready — the first seconds after boot,
 * or after a failed load — the old mget still answers, correctly and slowly,
 * and its documents are handed back so the caller does not fetch them twice.
 */
export async function fetchRankedOrganisations(ids: string[]): Promise<RankedOrganisations> {
    if (isOrganisationTableReady()) {
        const keys = new Map(
            getOrganisations(ids).map((row) => [
                row.id,
                {group: row.nameKey, funding: row.totalFundingEur, projectCount: row.projectCount, workCount: row.workCount},
            ]),
        )
        return {keys, documents: new Map()}
    }

    const documents = await fetchOrganisations(ids)
    return {
        keys: new Map(documents.map((document) => [document.id, keysFromDocument(document)])),
        documents: new Map(documents.map((document) => [document.id, document])),
    }
}

/** The records behind the rows actually being rendered. */
export async function fetchOrganisations(ids: string[]): Promise<OrganisationRawDoc[]> {
    if (ids.length === 0) return []
    return mgetDocuments<OrganisationRawDoc>(indices.organisationsIndexName, ids, ORG_SOURCE)
}
