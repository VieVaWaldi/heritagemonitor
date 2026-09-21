import type {query} from '@heritagemonitor/search'
import {
    MINORITY_FACET_FIELDS,
    SEARCH_PAGE_SIZE,
    entitySuggestResponseSchema,
    minorityDtoSchema,
    pageCountOf,
    type EntitySuggestResponse,
    type FacetDistribution,
    type FacetLabels,
    type MinorityDto,
    type MinorityFundersResponse,
    type MinoritySearchRequest,
    type MinoritySearchResponse,
    type MinorityTopicsResponse,
    type TopicCountsResponse,
    type WorkOrganisationsResponse,
} from '@heritagemonitor/shared'
import {
    defaultPageKey,
    isDefaultRequest,
    readDefaultPage,
    writeDefaultPage,
} from '../../common/search/defaultPageCache.js'
import {AppError} from '../../plugins/errors.js'
import {minorityWikipediaUrl} from '../../reference/minorityWikipedia.js'
import {topicAncestors, topicNames, topicOf} from '../../reference/topics.js'
import {getOrganisationsByIds} from '../organisations/organisations.service.js'
import * as opensearchRepository from './opensearch.repository.js'
import type {MinorityRawDoc} from './opensearch.repository.js'

// Service layer: the domain decisions. See apps/api/RULES.md rule 3.
//
// Module dependencies point one way (minorities -> organisations); the tabs
// that list this group's PROJECTS and WORKS are searches over those indexes
// with a `minority` filter, so they are served by those modules' own search
// endpoints rather than proxied here.

const SUGGEST_LIMIT = 8

/** How many minority qids the project probe may return — see the query builder. */
const PROBE_QID_LIMIT = 300

/** Organisations and funders shown per group before paging. */
const RELATED_AGG_SIZE = 200
const FUNDER_AGG_SIZE = 50

function toFilters(request: MinoritySearchRequest): query.MinorityFilters {
    return {
        corpus: request.c,
        country: request.country,
        topic: request.topic,
        type: request.type,
        religion: request.religion,
        language: request.language,
        subclass: request.subclass,
        territory: request.territory,
        home: request.home,
        hasSubgroups: request.hasSubgroups,
        only: request.only,
    }
}

/**
 * Raw documents are untyped, so this is the one place that trusts their
 * shape. The schema treats every optional field as possibly ABSENT, not
 * merely null — the index stores no nulls, and a `.nullable()` field here once
 * silently dropped every group without a population.
 */
function toDto(raw: MinorityRawDoc): MinorityDto | null {
    // The Wikipedia link is reference data, not an index field — joined on
    // here so every caller of this function gets it (see reference/minorityWikipedia).
    const result = minorityDtoSchema.safeParse({...raw, wikipediaUrl: minorityWikipediaUrl(raw?.qid ?? '')})
    if (result.success) return result.data
    console.warn(`Minority document '${raw?.qid ?? 'unknown'}' failed schema validation:`, result.error.issues)
    return null
}

function toFacetDistribution(aggregations: Record<string, query.TermsAggregationResult>): FacetDistribution {
    return Object.fromEntries(
        MINORITY_FACET_FIELDS.filter((facet) => aggregations[facet.field]).map((facet) => [
            facet.field,
            Object.fromEntries(
                aggregations[facet.field].buckets.map((bucket) => [bucket.key_as_string ?? String(bucket.key), bucket.doc_count]),
            ),
        ]),
    )
}

/** Topic ids are the one facet whose values are not their own label. */
function facetLabelsFor(distribution: FacetDistribution): FacetLabels {
    const topicBuckets = distribution.topic_ids
    if (!topicBuckets) return {}
    return {topic_ids: topicNames(Object.keys(topicBuckets))}
}

export async function searchMinorities(request: MinoritySearchRequest): Promise<MinoritySearchResponse> {
    const q = (request.q ?? '').trim()
    const page = request.page ?? 1

    const cacheable = isDefaultRequest(request, page)
    const cacheKey = defaultPageKey({entity: 'minorities', corpus: request.c, page, sort: request.sort})
    if (cacheable) {
        const cached = readDefaultPage<MinoritySearchResponse>(cacheKey)
        if (cached) return cached
    }

    // The two-step search. A group document knows its own Wikidata fields and
    // the titles of its top 200 projects — so a search for an INSTITUTION
    // ("Fraunhofer"), or for anything in a big group's other 2,000 projects,
    // finds nothing there. Asking the projects index which groups its matching
    // projects are tagged with, and folding those qids in, is what makes those
    // searches work.
    const boostQids = q ? await opensearchRepository.probeProjectsForQids(q, PROBE_QID_LIMIT) : []

    const result = await opensearchRepository.search({
        q,
        page,
        sort: request.sort,
        filters: toFilters(request),
        typoTolerant: q.length > 0,
        boostQids,
    })

    const facetDistribution = toFacetDistribution(result.aggregations)
    const response: MinoritySearchResponse = {
        hits: result.documents.map(toDto).filter((dto): dto is MinorityDto => dto !== null),
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

    if (cacheable) writeDefaultPage(cacheKey, response)
    return response
}

/**
 * Topic-tree counts for the groups the caller's CURRENT search matches.
 *
 * Two differences from the projects version. The group's own topic selection
 * is stripped for the same reason; and because this index has only leaf
 * `topic_ids`, the subfield and field numbers are rolled up here from the
 * topics table — they are "groups counted once per ancestor they touch", not
 * a separate aggregation.
 */
export async function aggregateMinorityTopicCounts(request: MinoritySearchRequest): Promise<TopicCountsResponse> {
    const {topic: _topic, ...withoutTopics} = request
    const buckets = await opensearchRepository.topicCounts(request.q ?? '', toFilters(withoutTopics), [])

    const topic: Record<string, number> = {}
    const subfield: Record<string, number> = {}
    const field: Record<string, number> = {}

    for (const bucket of buckets) {
        const id = String(bucket.key_as_string ?? bucket.key)
        topic[id] = bucket.doc_count

        const ancestors = topicAncestors(id)
        if (!ancestors) continue
        subfield[ancestors.subfield_id] = (subfield[ancestors.subfield_id] ?? 0) + bucket.doc_count
        field[ancestors.field_id] = (field[ancestors.field_id] ?? 0) + bucket.doc_count
    }

    return {field, subfield, topic}
}

export async function getMinorityByQid(qid: string): Promise<MinorityDto> {
    const raw = await opensearchRepository.getByQid(qid)
    if (!raw) throw new AppError(`Minority group '${qid}' not found`, 404)

    const dto = toDto(raw)
    if (!dto) throw new AppError(`Minority group '${qid}' failed schema validation`, 500)
    return dto
}

/**
 * Every Wikidata id a group's projects may be tagged with. In today's data
 * `merged_qids` holds only the primary qid, but tagging happens upstream and
 * a merge could introduce others — asking for the union costs nothing and
 * cannot miss a project.
 */
async function taggedQids(qid: string): Promise<string[]> {
    const group = await getMinorityByQid(qid)
    return [...new Set([group.qid, ...group.merged_qids])]
}

/** The organisations that worked on this group's projects, most projects first. */
export async function getMinorityOrganisations(qid: string, page: number): Promise<WorkOrganisationsResponse> {
    const qids = await taggedQids(qid)
    const buckets = await opensearchRepository.organisationBuckets(qids, RELATED_AGG_SIZE)

    const from = (page - 1) * SEARCH_PAGE_SIZE
    if (from > 0 && from >= buckets.length) {
        throw new AppError(`Page ${page} is past the end of these ${buckets.length} organisations.`, 400)
    }

    const ids = buckets.slice(from, from + SEARCH_PAGE_SIZE).map((bucket) => String(bucket.key_as_string ?? bucket.key))
    // The rows come from the organisations module, which owns that shape;
    // this module only decided WHICH organisations (apps/api/RULES.md rule 4).
    const rows = await getOrganisationsByIds(ids, 1)

    return {hits: rows.hits, estimatedTotalHits: buckets.length, page, pageCount: pageCountOf(buckets.length)}
}

/**
 * The research topics this group's projects fall under, from the denormalised
 * `topic_counts` — no aggregation needed, the export already counted them.
 */
export async function getMinorityTopics(qid: string, page: number): Promise<MinorityTopicsResponse> {
    const group = await getMinorityByQid(qid)
    const counts = [...group.topic_counts].sort((a, b) => b.n - a.n)

    const from = (page - 1) * SEARCH_PAGE_SIZE
    if (from > 0 && from >= counts.length) {
        throw new AppError(`Page ${page} is past the end of these ${counts.length} topics.`, 400)
    }

    return {
        hits: counts.slice(from, from + SEARCH_PAGE_SIZE).map((count) => {
            const topic = topicOf(count.topic_id)
            return {
                topic_id: count.topic_id,
                topic_name: topic?.topic_name ?? count.topic_id,
                subfield_name: topic?.subfield_name ?? null,
                field_name: topic?.field_name ?? null,
                project_count: count.n,
            }
        }),
        estimatedTotalHits: counts.length,
        page,
        pageCount: pageCountOf(counts.length),
    }
}

/**
 * Who funded this group's projects. Aggregated from `funder`/`programme` on
 * the projects index: there is no per-group funding-stream field, so this is
 * funder-level with each funder's top programmes rather than a stream list.
 */
export async function getMinorityFunders(qid: string, page: number): Promise<MinorityFundersResponse> {
    const qids = await taggedQids(qid)
    const buckets = await opensearchRepository.funderBuckets(qids, FUNDER_AGG_SIZE)

    const from = (page - 1) * SEARCH_PAGE_SIZE
    if (from > 0 && from >= buckets.length) {
        throw new AppError(`Page ${page} is past the end of these ${buckets.length} funders.`, 400)
    }

    return {
        hits: buckets.slice(from, from + SEARCH_PAGE_SIZE).map((bucket) => ({
            funder: String(bucket.key_as_string ?? bucket.key),
            programmes: (bucket.programmes?.buckets ?? []).map((programme) =>
                String(programme.key_as_string ?? programme.key),
            ),
            project_count: bucket.doc_count,
        })),
        estimatedTotalHits: buckets.length,
        page,
        pageCount: pageCountOf(buckets.length),
    }
}

export async function suggestMinorities(q: string): Promise<EntitySuggestResponse> {
    if (!q.trim()) return {suggestions: []}

    const documents = await opensearchRepository.suggest(q.trim(), SUGGEST_LIMIT)
    return entitySuggestResponseSchema.parse({
        suggestions: documents.map((document) => ({
            id: document.qid,
            label: document.group_name_en,
            hint: document.project_count != null ? `${document.project_count} projects` : undefined,
        })),
    })
}
