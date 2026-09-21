import type {query} from '@heritagemonitor/search'
import {
    parseYearRange,
    workDetailSchema,
    workRowSchema,
    type WorkDetail,
    type WorkOrganisationsResponse,
    type WorkProjectsResponse,
    type WorkRow,
    type WorkSearchRequest,
    type WorkSearchResponse,
} from '@heritagemonitor/shared'
import {
    defaultPageKey,
    isDefaultRequest,
    readDefaultPage,
    writeDefaultPage,
} from '../../common/search/defaultPageCache.js'
import {AppError} from '../../plugins/errors.js'
import {getOrganisationsByIds} from '../organisations/organisations.service.js'
import {getProjectsByIds} from '../projects/projects.service.js'
import * as opensearchRepository from './opensearch.repository.js'
import type {WorkRawDoc} from './opensearch.repository.js'

// Service layer: the domain decisions. Transport-agnostic; storage details
// stay in the repository. See apps/api/RULES.md rule 3.
//
// Module dependencies point ONE way — works -> projects, works ->
// organisations — because that is the direction the data points: a work
// carries `project_ids` and `organisation_ids`, neither of the others carries
// work ids. The reverse ("the works of this project") is a SEARCH over works,
// so it lives here too, exposed under the other modules' URLs by their route
// files (apps/api/RULES.md rule 4).

// BM25 has nothing to rank on without a query, so a blank one is ordered by
// citations (plan section 1, blank-query defaults).
function resolveSort(q: string, requested: WorkSearchRequest['sort']): query.WorkSort {
    if (requested) return requested
    return q.trim() ? 'relevance' : 'citations'
}

function toFilters(request: WorkSearchRequest): query.WorkFilters {
    // An unparseable `years` drops the year filter rather than failing the
    // request — the value comes from a URL a user may have edited.
    const years = parseYearRange(request.years)

    return {
        corpus: request.c,
        ...(years ? {year: years} : {}),
        oa: request.oa,
        language: request.language,
        publisher: request.publisher,
        project: request.project,
        org: request.org,
        minority: request.minority,
        only: request.only,
    }
}

function toRow(raw: WorkRawDoc): WorkRow | null {
    const result = workRowSchema.safeParse(raw)
    if (result.success) return result.data
    console.warn(`Work document '${raw?.id ?? 'unknown'}' failed row validation:`, result.error.issues)
    return null
}

export async function searchWorks(request: WorkSearchRequest): Promise<WorkSearchResponse> {
    const q = request.q ?? ''
    const page = request.page ?? 1

    // The blank default page is the same answer for everyone and the most
    // expensive one to produce (50M documents ordered by citation count) —
    // see common/search/defaultPageCache.
    const cacheable = isDefaultRequest(request, page)
    const cacheKey = defaultPageKey({entity: 'works', corpus: request.c, page, sort: request.sort})
    if (cacheable) {
        const cached = readDefaultPage<WorkSearchResponse>(cacheKey)
        if (cached) return cached
    }

    const result = await opensearchRepository.search({
        q,
        page,
        sort: resolveSort(q, request.sort),
        filters: toFilters(request),
        typoTolerant: q.trim().length > 0,
    })

    const response: WorkSearchResponse = {
        hits: result.documents.map(toRow).filter((row): row is WorkRow => row !== null),
        // No aggregations on this index at all — see the repository.
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

    if (cacheable) writeDefaultPage(cacheKey, response)
    return response
}

export async function getWorkById(id: string): Promise<WorkDetail> {
    const raw = await opensearchRepository.getById(id)
    if (!raw) throw new AppError(`Work '${id}' not found`, 404)

    const result = workDetailSchema.safeParse(raw)
    if (!result.success) {
        console.warn(`Work document '${id}' failed schema validation:`, result.error.issues)
        throw new AppError(`Work '${id}' failed schema validation`, 500)
    }
    return result.data
}

/** The projects a work belongs to — an id lookup, delegated to their module. */
export async function getWorkProjects(id: string, page: number): Promise<WorkProjectsResponse> {
    const work = await getWorkById(id)
    return getProjectsByIds(work.project_ids, page)
}

/**
 * The organisations behind a work. The index caps the id list at 100 even when
 * `org_count` is higher, so the total here is the number of ids actually
 * stored, not the true one.
 */
export async function getWorkOrganisations(id: string, page: number): Promise<WorkOrganisationsResponse> {
    const work = await getWorkById(id)
    return getOrganisationsByIds(work.organisation_ids, page)
}

/**
 * The works of one project or one organisation: a works SEARCH with a term
 * filter, ranked by citations. Exposed under `/v1/projects/:id/works` and
 * `/v1/organisations/:id/works` by those modules' route files — the endpoint
 * is theirs, the business is this module's.
 */
export async function searchWorksFor(link: {project?: string; organisation?: string}, page: number): Promise<WorkSearchResponse> {
    return searchWorks({
        page,
        sort: 'citations',
        ...(link.project ? {project: [link.project]} : {}),
        ...(link.organisation ? {org: [link.organisation]} : {}),
    })
}
