import type {query} from '@heritagemonitor/search'
import {
    EXPERT_LIST_LIMIT,
    MAX_URL_TOPICS,
    PROJECT_FACET_FIELDS,
    PROJECT_YEAR_HISTOGRAM,
    SEARCH_PAGE_SIZE,
    expertRowSchema,
    organisationRowSchema,
    parseYearRange,
    type ExpertRow,
    type ExpertSearchRequest,
    type ExpertSearchResponse,
    type FacetDistribution,
    type FacetLabels,
} from '@heritagemonitor/shared'
import {AppError} from '../../plugins/errors.js'
import {topicNames} from '../../reference/topics.js'
import type {OrganisationRawDoc} from '../organisations/opensearch.repository.js'
import * as opensearchRepository from './opensearch.repository.js'

// Service layer: the domain decisions behind "who are the experts on this".
//
// The whole answer is derived, not stored: rank the organisations behind the
// projects a search matched, merge the duplicate institutions, and sort by
// either that match count or the organisations' own lifetime figures.

function toFilters(request: ExpertSearchRequest): query.ProjectFilters {
    const topicSelectionSize = (request.topic?.length ?? 0) + (request.subfield?.length ?? 0) + (request.field?.length ?? 0)
    if (topicSelectionSize > MAX_URL_TOPICS) {
        throw new AppError(`At most ${MAX_URL_TOPICS} topics can be selected at once (got ${topicSelectionSize}).`, 400)
    }

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
        minority: request.minority,
    }
}

interface RankedExpert {
    document: OrganisationRawDoc
    matchedProjects: number
    mergedIds: string[]
}

/**
 * D19: the same institution is in the index several times, under different
 * ids with the same normalised name and country. Left alone, a search for a
 * big university returns it three times with its work split between the rows.
 *
 * So rows sharing a `name_key` are folded into one: their matches are SUMMED
 * (each id's projects are that institution's projects), the best-ranked id
 * represents the group, and the row says how many records it stands for.
 * An organisation without a `name_key` is only ever itself.
 */
function mergeByNameKey(buckets: query.TermsBucket[], documents: Map<string, OrganisationRawDoc>): RankedExpert[] {
    const groups = new Map<string, RankedExpert>()

    for (const bucket of buckets) {
        const id = String(bucket.key_as_string ?? bucket.key)
        const document = documents.get(id)
        // An id with no organisation record cannot be shown or linked to.
        if (!document) continue

        const key = document.name_key ?? `id:${id}`
        const existing = groups.get(key)
        if (existing) {
            existing.matchedProjects += bucket.doc_count
            existing.mergedIds.push(id)
            continue
        }
        // Buckets arrive in count order, so the first id of a group is its
        // best-ranked one and becomes its representative.
        groups.set(key, {document, matchedProjects: bucket.doc_count, mergedIds: [id]})
    }

    return [...groups.values()]
}

const SORTERS: Record<string, (a: RankedExpert, b: RankedExpert) => number> = {
    matches: (a, b) => b.matchedProjects - a.matchedProjects,
    funding: (a, b) => (b.document.total_funding_eur ?? 0) - (a.document.total_funding_eur ?? 0),
    projects: (a, b) => (b.document.project_count ?? 0) - (a.document.project_count ?? 0),
    works: (a, b) => (b.document.work_count ?? 0) - (a.document.work_count ?? 0),
}

function toRow(expert: RankedExpert): ExpertRow | null {
    const organisation = organisationRowSchema.safeParse({...expert.document, hasGeo: expert.document.geo != null})
    if (!organisation.success) {
        console.warn(`Organisation '${expert.document?.id ?? 'unknown'}' failed row validation:`, organisation.error.issues)
        return null
    }

    const row = expertRowSchema.safeParse({
        ...organisation.data,
        matchedProjects: expert.matchedProjects,
        mergedRecords: expert.mergedIds.length,
        mergedIds: expert.mergedIds,
    })
    return row.success ? row.data : null
}

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

function facetLabelsFor(distribution: FacetDistribution): FacetLabels {
    const topicBuckets = distribution.topic_id
    return topicBuckets ? {topic_id: topicNames(Object.keys(topicBuckets))} : {}
}

export async function searchExperts(request: ExpertSearchRequest): Promise<ExpertSearchResponse> {
    const q = (request.q ?? '').trim()
    const page = request.page ?? 1

    const result = await opensearchRepository.searchExpertProjects({
        q,
        filters: toFilters(request),
        typoTolerant: q.length > 0,
    })
    const {orgs, organisationCount, facets} = opensearchRepository.readExpertAggregations(result.aggregations)

    // One mget for the whole ranked set, not per page: the merge below needs
    // every name_key before it can know what page 1 even contains.
    const ids = orgs.map((bucket) => String(bucket.key_as_string ?? bucket.key))
    const documents = await opensearchRepository.fetchOrganisations(ids)
    const byId = new Map(documents.map((document) => [document.id, document]))

    const merged = mergeByNameKey(orgs, byId)
    const sorted = [...merged].sort(SORTERS[request.sort ?? 'matches'] ?? SORTERS.matches)

    const from = (page - 1) * SEARCH_PAGE_SIZE
    if (from > 0 && from >= sorted.length) {
        throw new AppError(`Page ${page} is past the end of these ${sorted.length} organisations.`, 400)
    }

    const facetDistribution = toFacetDistribution(facets)
    return {
        hits: sorted
            .slice(from, from + SEARCH_PAGE_SIZE)
            .map(toRow)
            .filter((row): row is ExpertRow => row !== null),
        facetDistribution,
        facetLabels: facetLabelsFor(facetDistribution),
        // The honest total is how many distinct organisations are behind the
        // matching projects — an approximate count, hence the "about N"
        // wording the shared envelope already has for capped totals.
        estimatedTotalHits: organisationCount,
        totalCapped: true,
        approxTotal: organisationCount,
        mode: result.mode,
        didYouMean: result.didYouMean,
        page,
        // Paging stops at the ranked set, not at the total: beyond the top 200
        // there is nothing to show.
        pageCount: Math.max(1, Math.ceil(sorted.length / SEARCH_PAGE_SIZE)),
        rankedOrganisations: sorted.length,
        listCapped: orgs.length >= EXPERT_LIST_LIMIT,
    }
}
