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
import type {OrganisationRankingKeys} from './opensearch.repository.js'
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
    /** The best-ranked id of the group; the one whose record is shown. */
    id: string
    keys: OrganisationRankingKeys
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
function mergeByNameKey(buckets: query.TermsBucket[], keysById: Map<string, OrganisationRankingKeys>): RankedExpert[] {
    const groups = new Map<string, RankedExpert>()

    for (const bucket of buckets) {
        const id = String(bucket.key_as_string ?? bucket.key)
        const keys = keysById.get(id)
        // An id with no organisation record cannot be shown or linked to.
        if (!keys) continue

        const key = keys.group ?? `id:${id}`
        const existing = groups.get(key)
        if (existing) {
            existing.matchedProjects += bucket.doc_count
            existing.mergedIds.push(id)
            continue
        }
        // Buckets arrive in count order, so the first id of a group is its
        // best-ranked one and becomes its representative.
        groups.set(key, {id, keys, matchedProjects: bucket.doc_count, mergedIds: [id]})
    }

    return [...groups.values()]
}

const SORTERS: Record<string, (a: RankedExpert, b: RankedExpert) => number> = {
    matches: (a, b) => b.matchedProjects - a.matchedProjects,
    funding: (a, b) => b.keys.funding - a.keys.funding,
    projects: (a, b) => b.keys.projectCount - a.keys.projectCount,
    works: (a, b) => b.keys.workCount - a.keys.workCount,
}

function toRow(expert: RankedExpert, document: OrganisationRawDoc | undefined): ExpertRow | null {
    // The record is fetched after paging, so it can in principle be missing
    // (an organisation deleted between the two calls). Nothing to show then.
    if (!document) return null

    const organisation = organisationRowSchema.safeParse({...document, hasGeo: document.geo != null})
    if (!organisation.success) {
        console.warn(`Organisation '${document.id}' failed row validation:`, organisation.error.issues)
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

    // Ranking keys for the whole ranked set, not just a page: the merge below
    // needs every name key before it can know what page 1 even contains. From
    // memory when the organisation table is loaded, otherwise from one mget.
    const ids = orgs.map((bucket) => String(bucket.key_as_string ?? bucket.key))
    const ranked = await opensearchRepository.fetchRankedOrganisations(ids)

    const merged = mergeByNameKey(orgs, ranked.keys)
    const sorted = [...merged].sort(SORTERS[request.sort ?? 'matches'] ?? SORTERS.matches)

    const from = (page - 1) * SEARCH_PAGE_SIZE
    if (from > 0 && from >= sorted.length) {
        throw new AppError(`Page ${page} is past the end of these ${sorted.length} organisations.`, 400)
    }

    // Only the rows being rendered need a full record, and the table does not
    // carry the display-only fields (short name, ROR type, website). So: rank
    // 200 from memory, fetch 20 from the index. When the keys came from an
    // mget the documents are already in hand and nothing more is fetched.
    const shown = sorted.slice(from, from + SEARCH_PAGE_SIZE)
    const documents =
        ranked.documents.size > 0
            ? ranked.documents
            : new Map((await opensearchRepository.fetchOrganisations(shown.map((expert) => expert.id))).map((d) => [d.id, d]))

    const facetDistribution = toFacetDistribution(facets)
    return {
        hits: shown.map((expert) => toRow(expert, documents.get(expert.id))).filter((row): row is ExpertRow => row !== null),
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
