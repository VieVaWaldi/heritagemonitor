import type {query} from '@heritagemonitor/search'
import {
    PROJECT_FACET_FIELDS,
    projectDetailSchema,
    projectRowSchema,
    type FacetDistribution,
    type FacetLabels,
    type ProjectDetail,
    type ProjectRow,
    type ProjectSearchRequest,
    type ProjectSearchResponse,
} from '@heritagemonitor/shared'
import {AppError} from '../../plugins/errors.js'
import {topicNames, topicOf} from '../../reference/topics.js'
import * as opensearchRepository from './opensearch.repository.js'
import type {ProjectRawDoc} from './opensearch.repository.js'

// Service layer: the domain decisions — which sort a request really gets,
// what a document looks like once the topic table has been joined onto it,
// and which facet values need a label. Transport-agnostic; storage details
// stay in the repository. See apps/api/RULES.md rule 3.

// BM25 is meaningless without a query text, so a blank query is ranked by
// money instead of by an all-equal score (plan section 1, blank-query
// defaults). An explicit `sort` from the client always wins.
function resolveSort(q: string, requested: ProjectSearchRequest['sort']): query.ProjectSort {
    if (requested) return requested
    return q.trim() ? 'relevance' : 'budget'
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

function toFacetDistribution(aggregations: Record<string, query.TermsAggregationResult>): FacetDistribution {
    return Object.fromEntries(
        PROJECT_FACET_FIELDS.filter((facet) => aggregations[facet.field]).map((facet) => [
            facet.field,
            Object.fromEntries(
                aggregations[facet.field].buckets.map((bucket) => [bucket.key_as_string ?? String(bucket.key), bucket.doc_count]),
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
        filters: {corpus: request.c, only: request.only},
    })

    const facetDistribution = toFacetDistribution(result.aggregations)
    return {
        hits: result.documents.map(toRow).filter((row): row is ProjectRow => row !== null),
        facetDistribution,
        facetLabels: facetLabelsFor(facetDistribution),
        estimatedTotalHits: result.total,
        totalCapped: result.totalCapped,
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
