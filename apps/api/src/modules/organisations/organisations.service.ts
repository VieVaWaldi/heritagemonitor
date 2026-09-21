import type {query} from '@heritagemonitor/search'
import {
    ORGANISATION_FACET_FIELDS,
    SEARCH_PAGE_SIZE,
    entitySuggestResponseSchema,
    pageCountOf,
    organisationDetailSchema,
    organisationRowSchema,
    type EntitySuggestResponse,
    type FacetDistribution,
    type FacetValuesResponse,
    type OrganisationDetail,
    type OrganisationProjectsResponse,
    type OrganisationRow,
    type OrganisationSearchRequest,
    type OrganisationSearchResponse,
    type WorkOrganisationsResponse,
} from '@heritagemonitor/shared'
import {
    defaultPageKey,
    isDefaultRequest,
    readDefaultPage,
    writeDefaultPage,
} from '../../common/search/defaultPageCache.js'
import {AppError} from '../../plugins/errors.js'
import {searchOrganisationProjects} from '../projects/projects.service.js'
import * as opensearchRepository from './opensearch.repository.js'
import type {OrganisationRawDoc} from './opensearch.repository.js'

// Service layer: the domain decisions — how request params become index
// filters, what a document looks like as a DTO, which facets can be typed
// into. Transport-agnostic. See apps/api/RULES.md rule 3.

const SUGGEST_LIMIT = 8
const DEFAULT_FACET_VALUES_SIZE = 20

/**
 * Request params -> index filters. The param names are the URL's own (see
 * apps/web/src/common/url), the field names are the index's; this function is
 * the only place the two meet.
 */
function toFilters(request: OrganisationSearchRequest): query.OrganisationFilters {
    return {
        corpus: request.c,
        region: request.region,
        rorType: request.ror,
        country: request.country,
        only: request.only,
    }
}

// Raw OpenSearch documents are untyped, so this is the one place that trusts
// their shape — validated against the same schema the response is built from.
// `hasGeo` is derived here rather than shipped as coordinates: these screens
// have no map, they only need to say which organisations could appear on one.
function toRow(raw: OrganisationRawDoc): OrganisationRow | null {
    const result = organisationRowSchema.safeParse({...raw, hasGeo: raw.geo != null})
    if (result.success) return result.data
    console.warn(`Organisation document '${raw?.id ?? 'unknown'}' failed row validation:`, result.error.issues)
    return null
}

function toFacetDistribution(aggregations: Record<string, query.TermsAggregationResult>): FacetDistribution {
    return Object.fromEntries(
        ORGANISATION_FACET_FIELDS.filter((facet) => aggregations[facet.field]).map((facet) => [
            facet.field,
            Object.fromEntries(
                aggregations[facet.field].buckets.map((bucket) => [bucket.key_as_string ?? String(bucket.key), bucket.doc_count]),
            ),
        ]),
    )
}

export async function searchOrganisations(request: OrganisationSearchRequest): Promise<OrganisationSearchResponse> {
    const q = request.q ?? ''
    const page = request.page ?? 1

    // See common/search/defaultPageCache: the blank first pages are the same
    // answer for everyone, so they are held rather than recomputed.
    const cacheable = isDefaultRequest(request, page)
    const cacheKey = defaultPageKey({entity: 'organisations', corpus: request.c, page, sort: request.sort})
    if (cacheable) {
        const cached = readDefaultPage<OrganisationSearchResponse>(cacheKey)
        if (cached) return cached
    }

    const result = await opensearchRepository.search({
        q,
        page,
        sort: request.sort,
        filters: toFilters(request),
        // A blank query has nothing to misspell, and its strict result set is
        // already the whole corpus.
        typoTolerant: q.trim().length > 0,
    })

    const response: OrganisationSearchResponse = {
        hits: result.documents.map(toRow).filter((row): row is OrganisationRow => row !== null),
        facetDistribution: toFacetDistribution(result.aggregations),
        // No organisation facet has id-like values (regions, ROR types and
        // country codes are their own labels), so there is nothing to resolve.
        facetLabels: {},
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
 * Organisations by id, one page at a time — for a work's organisations tab.
 * A plain lookup, not a search.
 */
export async function getOrganisationsByIds(ids: string[], page: number): Promise<WorkOrganisationsResponse> {
    const from = (page - 1) * SEARCH_PAGE_SIZE
    if (from > 0 && from >= ids.length) {
        throw new AppError(`Page ${page} is past the end of these ${ids.length} organisations.`, 400)
    }

    const documents = await opensearchRepository.getOrganisationsByIds(ids.slice(from, from + SEARCH_PAGE_SIZE))
    return {
        hits: documents.map(toRow).filter((row): row is OrganisationRow => row !== null),
        estimatedTotalHits: ids.length,
        page,
        pageCount: pageCountOf(ids.length),
    }
}

export async function getOrganisationById(id: string): Promise<OrganisationDetail> {
    const raw = await opensearchRepository.getById(id)
    if (!raw) throw new AppError(`Organisation '${id}' not found`, 404)

    const result = organisationDetailSchema.safeParse({...raw, hasGeo: raw.geo != null})
    if (!result.success) {
        console.warn(`Organisation document '${id}' failed schema validation:`, result.error.issues)
        throw new AppError(`Organisation '${id}' failed schema validation`, 500)
    }
    return result.data
}

/**
 * The projects this organisation worked on.
 *
 * Delegated to the projects module's own service rather than querying the
 * projects index from here: the ranking, the typo fallback and the row
 * mapping are that module's business, and going through its service function
 * is what keeps the two modules separable (apps/api/RULES.md rule 4).
 */
export async function getOrganisationProjects(
    id: string,
    page: number,
    narrow: Parameters<typeof searchOrganisationProjects>[2] = {},
): Promise<OrganisationProjectsResponse> {
    return searchOrganisationProjects(id, page, narrow)
}

/** Which facets can be typed into. A whitelist — see the projects module's twin. */
const SEARCHABLE_FACETS = new Map<string, string>(ORGANISATION_FACET_FIELDS.map((facet) => [facet.param, facet.field]))

export async function getOrganisationFacetValues(
    request: OrganisationSearchRequest & {facet?: string; facetQ?: string; size?: number},
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
 * Type-ahead. The hint carries the country and how many projects the
 * organisation has — the two things that tell apart the several "University
 * of ..." entries a prefix usually matches.
 */
export async function suggestOrganisations(q: string): Promise<EntitySuggestResponse> {
    if (!q.trim()) return {suggestions: []}

    const documents = await opensearchRepository.suggest(q.trim(), SUGGEST_LIMIT)
    return entitySuggestResponseSchema.parse({
        suggestions: documents
            .filter((document) => document.legalName ?? document.legalShortName)
            .map((document) => ({
                id: document.id,
                label: document.legalName ?? document.legalShortName,
                hint:
                    [document.countryCode, document.project_count != null ? `${document.project_count} projects` : null]
                        .filter(Boolean)
                        .join(' · ') || undefined,
            })),
    })
}
