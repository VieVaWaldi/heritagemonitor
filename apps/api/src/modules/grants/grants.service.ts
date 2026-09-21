import type {query} from '@heritagemonitor/search'
import {
    GRANT_FACET_FIELDS,
    GRANT_ORGANISATION_LIMIT,
    entitySuggestResponseSchema,
    grantDetailSchema,
    grantRowSchema,
    grantTitle,
    type EntitySuggestResponse,
    type FacetDistribution,
    type FacetLabels,
    type FacetValuesResponse,
    type GrantDetail,
    type GrantOrganisation,
    type GrantOrganisationsResponse,
    type GrantRow,
    type GrantSearchRequest,
    type GrantSearchResponse,
} from '@heritagemonitor/shared'
import {defaultPageKey, isDefaultRequest, readDefaultPage, writeDefaultPage} from '../../common/search/defaultPageCache.js'
import {AppError} from '../../plugins/errors.js'
import {getOrganisations, isOrganisationTableReady} from '../../reference/organisationTable.js'
import {topProjectOrganisations} from '../projects/projects.service.js'
import * as opensearchRepository from './opensearch.repository.js'
import type {GrantRawDoc} from './opensearch.repository.js'

// Service layer: what a funding stream means. Transport-agnostic; see
// apps/api/RULES.md rule 3.

const SUGGEST_LIMIT = 8

/**
 * How many funding streams the project probe may return. Above the ~950 that
 * have heritage projects, so in practice nothing is cut; see the query
 * builder for what a cut would mean.
 */
const PROBE_STREAM_LIMIT = 1_000
const DEFAULT_FACET_VALUES_SIZE = 20

function toFilters(request: GrantSearchRequest): query.GrantFilters {
    return {
        corpus: request.c,
        funder: request.funder,
        programme: request.programme,
        jurisdiction: request.jurisdiction,
        only: request.only,
    }
}

function toRow(raw: GrantRawDoc): GrantRow | null {
    const result = grantRowSchema.safeParse(raw)
    if (result.success) return result.data
    console.warn(`Grant document '${raw?.id ?? 'unknown'}' failed row validation:`, result.error.issues)
    return null
}

function toFacetDistribution(aggregations: Record<string, query.TermsAggregationResult>): FacetDistribution {
    return Object.fromEntries(
        GRANT_FACET_FIELDS.filter((facet) => aggregations[facet.field]).map((facet) => [
            facet.field,
            Object.fromEntries(
                aggregations[facet.field].buckets.map((bucket) => [bucket.key_as_string ?? String(bucket.key), bucket.doc_count]),
            ),
        ]),
    )
}

/**
 * The funder facet's values are codes (`EC`, `NWO`, `100010414`), which nobody
 * can read, so they get labels the same way topic ids do. Programme and
 * jurisdiction are already their own labels.
 */
async function facetLabelsFor(distribution: FacetDistribution): Promise<FacetLabels> {
    const codes = Object.keys(distribution.funder ?? {})
    if (codes.length === 0) return {}
    return {funder: Object.fromEntries(await opensearchRepository.funderNames(codes))}
}

export async function searchGrants(request: GrantSearchRequest): Promise<GrantSearchResponse> {
    const q = request.q ?? ''
    const page = request.page ?? 1

    const cacheable = isDefaultRequest(request, page)
    const cacheKey = defaultPageKey({entity: 'grants', corpus: request.c, page, sort: request.sort})
    if (cacheable) {
        const cached = readDefaultPage<GrantSearchResponse>(cacheKey)
        if (cached) return cached
    }

    // Two-step (D-minorities pattern): a stream document says nothing about
    // what its projects are ABOUT, so a subject search has to go through the
    // projects index first. A blank query needs no probe.
    const boostIds = q.trim() ? await opensearchRepository.probeProjectsForStreams(q, PROBE_STREAM_LIMIT) : []

    const result = await opensearchRepository.search({
        q,
        page,
        sort: request.sort,
        filters: toFilters(request),
        typoTolerant: q.trim().length > 0,
        boostIds,
    })

    const facetDistribution = toFacetDistribution(result.aggregations)
    const response: GrantSearchResponse = {
        hits: result.documents.map(toRow).filter((row): row is GrantRow => row !== null),
        facetDistribution,
        facetLabels: await facetLabelsFor(facetDistribution),
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

export async function getGrantById(id: string): Promise<GrantDetail> {
    const raw = await opensearchRepository.getById(id)
    if (!raw) throw new AppError(`Funding stream '${id}' not found`, 404)

    const result = grantDetailSchema.safeParse(raw)
    if (!result.success) {
        console.warn(`Grant document '${id}' failed schema validation:`, result.error.issues)
        throw new AppError(`Funding stream '${id}' failed schema validation`, 500)
    }
    return result.data
}

const SEARCHABLE_FACETS = new Map<string, string>(GRANT_FACET_FIELDS.map((facet) => [facet.param, facet.field]))

export async function getGrantFacetValues(
    request: GrantSearchRequest & {facet?: string; facetQ?: string; size?: number},
): Promise<FacetValuesResponse> {
    const field = SEARCHABLE_FACETS.get(request.facet ?? '')
    if (!field) {
        throw new AppError(`Unknown facet '${request.facet}'. Searchable facets: ${[...SEARCHABLE_FACETS.keys()].join(', ')}.`, 400)
    }

    const buckets = await opensearchRepository.facetValues({
        field,
        q: request.facetQ ?? '',
        size: request.size ?? DEFAULT_FACET_VALUES_SIZE,
        filters: toFilters(request),
        textQuery: request.q ?? '',
    })

    // Funder buckets are codes; the menu has to show names, and the value it
    // filters on stays the code.
    const names = field === 'funder' ? await opensearchRepository.funderNames(buckets.map((b) => String(b.key_as_string ?? b.key))) : null

    return {
        field: request.facet!,
        values: buckets.map((bucket) => {
            const value = bucket.key_as_string ?? String(bucket.key)
            return {value, label: names?.get(value) ?? value, count: bucket.doc_count}
        }),
    }
}

/**
 * The organisations that took part in a stream's projects, most projects
 * first.
 *
 * Two steps: ask the projects module who ran the stream's projects (it owns
 * the projects index), then resolve those ids to names through the in-memory
 * organisation table. No `mget` fallback here, unlike the experts page: this
 * is a secondary tab, and during the seconds the table is still loading it is
 * better to say so than to fire a second 20-document fetch at a cold cluster
 * that is already busy loading the table.
 */
export async function getGrantOrganisations(id: string, corpus: GrantSearchRequest['c']): Promise<GrantOrganisationsResponse> {
    const ranked = await topProjectOrganisations({stream: [id], c: corpus}, GRANT_ORGANISATION_LIMIT)
    if (!isOrganisationTableReady()) return {organisations: [], complete: false}

    const byId = new Map(getOrganisations(ranked.map((entry) => entry.id)).map((row) => [row.id, row]))

    // D19: the same institution sits in the index under several ids sharing a
    // `name_key`. Left alone, "University of Cambridge" appears twice in this
    // list with its projects split between the rows. Rows sharing a key are
    // folded into one — their project counts SUMMED, the best-ranked id
    // representing the group — exactly as the experts page does it. An
    // organisation with no key is only ever itself.
    const groups = new Map<string, GrantOrganisation>()
    for (const entry of ranked) {
        const row = byId.get(entry.id)
        // An id with no organisation record cannot be named or linked to.
        if (!row) continue

        const key = row.nameKey ?? `id:${row.id}`
        const existing = groups.get(key)
        if (existing) {
            existing.projects += entry.projects
            continue
        }
        // Entries arrive in count order, so the first id of a group is its
        // best-ranked one and becomes its representative.
        groups.set(key, {
            id: row.id,
            name: row.name,
            country: row.country,
            projects: entry.projects,
            total_funding_eur: row.totalFundingEur,
        })
    }

    // Merging can reorder: two second-place records can outweigh a first.
    const organisations = [...groups.values()].sort((a, b) => b.projects - a.projects)
    return {organisations, complete: true}
}

/**
 * Type-ahead. The hint is the funder and how many heritage projects the stream
 * funded — what tells apart the dozens of similarly named calls of one
 * programme.
 */
export async function suggestGrants(q: string): Promise<EntitySuggestResponse> {
    if (!q.trim()) return {suggestions: []}

    const documents = await opensearchRepository.suggest(q.trim(), SUGGEST_LIMIT)
    return entitySuggestResponseSchema.parse({
        suggestions: documents.map((document) => ({
            id: document.id,
            label: grantTitle({
                description: document.description ?? null,
                funder_name: document.funder_name ?? null,
                funder: document.funder ?? null,
                is_pseudo: document.is_pseudo ?? false,
                id: document.id,
            }),
            hint: [document.funder_name ?? document.funder, `${document.dch_project_count ?? 0} heritage projects`]
                .filter(Boolean)
                .join(' · '),
        })),
    })
}
