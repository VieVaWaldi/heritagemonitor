import type {query} from '@heritagemonitor/search'
import {
    MAX_URL_TOPICS,
    PROJECT_FACET_FIELDS,
    PROJECT_YEAR_HISTOGRAM,
    SEARCH_PAGE_SIZE,
    entitySuggestResponseSchema,
    organisationRowSchema,
    pageCountOf,
    parseYearRange,
    projectDetailSchema,
    projectRowSchema,
    type EntitySuggestResponse,
    type FacetDistribution,
    type FacetValuesResponse,
    type FacetLabels,
    type ProjectDetail,
    type OrganisationProjectsResponse,
    type ProjectOrganisation,
    type ProjectOrganisationsResponse,
    type ProjectRow,
    type ProjectSearchRequest,
    type ProjectSearchResponse,
} from '@heritagemonitor/shared'
import {AppError} from '../../plugins/errors.js'
import {topicNames, topicOf} from '../../reference/topics.js'
import * as opensearchRepository from './opensearch.repository.js'
import type {OrganisationRawDoc, ProjectRawDoc} from './opensearch.repository.js'

// Service layer: the domain decisions — which sort a request really gets, how
// its params become index filters, what a document looks like once the topic
// table has been joined onto it, and which facet values need a label.
// Transport-agnostic; storage details stay in the repository. See
// apps/api/RULES.md rule 3.

const SUGGEST_LIMIT = 8

// BM25 is meaningless without a query text, so a blank query is ranked by
// money instead of by an all-equal score (plan section 1, blank-query
// defaults). An explicit `sort` from the client always wins.
function resolveSort(q: string, requested: ProjectSearchRequest['sort']): query.ProjectSort {
    if (requested) return requested
    return q.trim() ? 'relevance' : 'budget'
}

/**
 * Request params -> index filters. The param names are the URL's own (see
 * apps/web/src/common/url), the field names are the index's; this function is
 * the only place the two meet.
 */
function toFilters(request: ProjectSearchRequest): query.ProjectFilters {
    const topicSelectionSize = (request.topic?.length ?? 0) + (request.subfield?.length ?? 0) + (request.field?.length ?? 0)
    if (topicSelectionSize > MAX_URL_TOPICS) {
        throw new AppError(`At most ${MAX_URL_TOPICS} topics can be selected at once (got ${topicSelectionSize}).`, 400)
    }

    // An unparseable `years` drops the year filter rather than failing the
    // request: the value comes from a URL a user may have edited or an old
    // link, and losing one filter is friendlier than refusing the page.
    const years = parseYearRange(request.years)

    return {
        corpus: request.c,
        ...(years ? {year: years} : {}),
        theme: request.theme,
        pillar: request.pillar,
        funder: request.funder,
        programme: request.programme,
        region: request.region,
        topic: request.topic,
        subfield: request.subfield,
        field: request.field,
        org: request.org,
        only: request.only,
    }
}

// Raw OpenSearch documents are untyped (an index enforces a mapping, not our
// contract), so this is the one place that trusts their shape — validated
// against the same schema the api's own response is built from, with the
// topic hierarchy joined on from the in-memory table (the index stores ids).
function toRow(raw: ProjectRawDoc): ProjectRow | null {
    const result = projectRowSchema.safeParse({...raw, topic: topicOf(raw.topic_id)})
    if (result.success) return result.data
    console.warn(`Project document '${raw?.id ?? 'unknown'}' failed row validation:`, result.error.issues)
    return null
}

// Facet values that are ids rather than words get a display label here; every
// other field's raw value already is its label. Only the buckets actually
// returned are looked up, not the whole 4,516-row table.
function facetLabelsFor(distribution: FacetDistribution): FacetLabels {
    const topicBuckets = distribution.topic_id
    if (!topicBuckets) return {}
    return {topic_id: topicNames(Object.keys(topicBuckets))}
}

/**
 * Terms buckets plus the year histogram, flattened to `{field: {value:
 * count}}`. The histogram rides in the same map under its own key — the web
 * reads it as "year -> number of projects", which is exactly a distribution.
 */
function toFacetDistribution(aggregations: Record<string, query.TermsAggregationResult>): FacetDistribution {
    const fields: string[] = [...PROJECT_FACET_FIELDS.map((facet) => facet.field), PROJECT_YEAR_HISTOGRAM]
    return Object.fromEntries(
        fields
            .filter((field) => aggregations[field])
            .map((field) => [
                field,
                Object.fromEntries(
                    aggregations[field].buckets.map((bucket) => [bucket.key_as_string ?? String(bucket.key), bucket.doc_count]),
                ),
            ]),
    )
}

export async function searchProjects(request: ProjectSearchRequest): Promise<ProjectSearchResponse> {
    const q = request.q ?? ''
    const result = await opensearchRepository.search({
        q,
        page: request.page ?? 1,
        sort: resolveSort(q, request.sort),
        filters: toFilters(request),
        // A blank query has nothing to misspell, and its strict result set is
        // already the whole corpus — a fallback could only make it slower.
        typoTolerant: q.trim().length > 0,
    })

    const facetDistribution = toFacetDistribution(result.aggregations)
    return {
        hits: result.documents.map(toRow).filter((row): row is ProjectRow => row !== null),
        facetDistribution,
        facetLabels: facetLabelsFor(facetDistribution),
        estimatedTotalHits: result.total,
        totalCapped: result.totalCapped,
        approxTotal: result.approxTotal,
        mode: result.mode,
        didYouMean: result.didYouMean,
        page: result.page,
        pageCount: result.pageCount,
    }
}

/**
 * Which facets can be typed into, by URL param name. A whitelist, not a
 * pass-through: `field` reaches an aggregation, so an arbitrary value would
 * let a caller aggregate any field of the index (including high-cardinality
 * ones that would hurt). Only the keyword facets the UI actually offers are
 * listed, and `topic_id` is excluded because its values are ids — typing
 * "arch" there would match nothing (the topics modal searches names instead).
 */
const SEARCHABLE_FACETS = new Map<string, string>(
    PROJECT_FACET_FIELDS.filter((facet) => facet.field !== 'topic_id').map((facet) => [facet.param, facet.field]),
)

const DEFAULT_FACET_VALUES_SIZE = 20

/**
 * Type-ahead over one facet's values, under the same query, corpus and
 * filters as the search itself — so the counts shown next to each value are
 * the counts the user would actually get.
 */
export async function getProjectFacetValues(
    request: ProjectSearchRequest & {facet?: string; facetQ?: string; size?: number},
): Promise<FacetValuesResponse> {
    const field = SEARCHABLE_FACETS.get(request.facet ?? '')
    if (!field) {
        throw new AppError(
            `Unknown facet '${request.facet}'. Searchable facets: ${[...SEARCHABLE_FACETS.keys()].join(', ')}.`,
            400,
        )
    }

    const buckets = await opensearchRepository.facetValues({
        field,
        q: request.facetQ ?? '',
        size: request.size ?? DEFAULT_FACET_VALUES_SIZE,
        filters: toFilters(request),
        textQuery: request.q ?? '',
    })

    return {
        field: request.facet!,
        values: buckets.map((bucket) => {
            const value = bucket.key_as_string ?? String(bucket.key)
            return {value, label: value, count: bucket.doc_count}
        }),
    }
}

/**
 * The projects one organisation worked on, as the organisations module's
 * projects tab lists them. Lives here, not there: ranking projects and mapping
 * project documents is this module's business, and the other module reaches it
 * through this function rather than through the projects index
 * (apps/api/RULES.md rule 4).
 *
 * `isCoordinator` is per project — the same organisation coordinates some of
 * its projects and merely participates in others.
 */
export async function searchOrganisationProjects(organisationId: string, page: number): Promise<OrganisationProjectsResponse> {
    const result = await opensearchRepository.search({
        q: '',
        page,
        // Biggest first: the question behind this tab is "what does this
        // institution actually do", and money is the best available proxy.
        sort: 'budget',
        filters: {org: [organisationId]},
        typoTolerant: false,
    })

    return {
        hits: result.documents
            .map(toRow)
            .filter((row): row is ProjectRow => row !== null)
            .map((row) => ({...row, isCoordinator: row.coordinator_ids.includes(organisationId)})),
        facetDistribution: {},
        facetLabels: {},
        estimatedTotalHits: result.total,
        totalCapped: result.totalCapped,
        approxTotal: result.approxTotal,
        mode: result.mode,
        didYouMean: result.didYouMean,
        page: result.page,
        pageCount: result.pageCount,
    }
}

export async function getProjectById(id: string): Promise<ProjectDetail> {
    const raw = await opensearchRepository.getById(id)
    if (!raw) throw new AppError(`Project '${id}' not found`, 404)

    const result = projectDetailSchema.safeParse({...raw, topic: topicOf(raw.topic_id)})
    if (!result.success) {
        console.warn(`Project document '${id}' failed schema validation:`, result.error.issues)
        throw new AppError(`Project '${id}' failed schema validation`, 500)
    }
    return result.data
}

function toOrganisation(raw: OrganisationRawDoc, coordinatorIds: Set<string>): ProjectOrganisation | null {
    const result = organisationRowSchema.safeParse({...raw, hasGeo: raw.geo != null})
    if (!result.success) {
        console.warn(`Organisation document '${raw?.id ?? 'unknown'}' failed row validation:`, result.error.issues)
        return null
    }
    return {...result.data, isCoordinator: coordinatorIds.has(result.data.id)}
}

/**
 * One page of the organisations that worked on a project.
 *
 * The order is the index's own: `projects.org_ids` is written coordinators
 * first (verified against EC projects, the only ones with a non-empty
 * `coordinator_ids`), so a page is a plain slice — nothing is re-sorted here,
 * and the order therefore cannot shift between pages.
 */
export async function getProjectOrganisations(id: string, page: number): Promise<ProjectOrganisationsResponse> {
    const project = await opensearchRepository.getById(id)
    if (!project) throw new AppError(`Project '${id}' not found`, 404)

    const orgIds = project.org_ids ?? []
    const from = (page - 1) * SEARCH_PAGE_SIZE
    if (from > 0 && from >= orgIds.length) {
        throw new AppError(`Page ${page} is past the end of this project's ${orgIds.length} organisations.`, 400)
    }

    const coordinatorIds = new Set(project.coordinator_ids ?? [])
    const documents = await opensearchRepository.getOrganisations(orgIds.slice(from, from + SEARCH_PAGE_SIZE))

    return {
        hits: documents
            .map((document) => toOrganisation(document, coordinatorIds))
            .filter((organisation): organisation is ProjectOrganisation => organisation !== null),
        estimatedTotalHits: orgIds.length,
        page,
        pageCount: pageCountOf(orgIds.length),
    }
}

/**
 * Type-ahead. The label is what the user is typing towards (the acronym when
 * there is one, else the title); the id lets the web open that exact project
 * rather than only re-running a text search for its name.
 */
export async function suggestProjects(q: string): Promise<EntitySuggestResponse> {
    if (!q.trim()) return {suggestions: []}

    const documents = await opensearchRepository.suggest(q.trim(), SUGGEST_LIMIT)
    return entitySuggestResponseSchema.parse({
        suggestions: documents
            .filter((document) => document.acronym ?? document.title)
            .map((document) => ({
                id: document.id,
                label: document.acronym ?? document.title,
                hint:
                    [document.acronym ? document.title : null, document.year ? String(document.year) : null, document.funder?.[0]]
                        .filter(Boolean)
                        .join(' · ') || undefined,
            })),
    })
}
