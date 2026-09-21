import type {query} from '@heritagemonitor/search'
import {
    SEARCH_PAGE_SIZE,
    FUNDING_TOP_ORGANISATIONS,
    pageCountOf,
    parseYearRange,
    type FundingMapResponse,
    type FundingOrganisation,
    type FundingOrganisationsResponse,
    type FundingRequest,
} from '@heritagemonitor/shared'
import {defaultPageKey, isDefaultRequest, readDefaultPage, writeDefaultPage} from '../../common/search/defaultPageCache.js'
import {AppError} from '../../plugins/errors.js'
import {getOrganisations, isOrganisationTableReady} from '../../reference/organisationTable.js'
import * as opensearchRepository from './opensearch.repository.js'

// Service layer: "whose money is this". Transport-agnostic; see
// apps/api/RULES.md rule 3.
//
// Both endpoints below are the SAME computation — rank organisations by the
// funding that reached them — cut two ways. The list pages through it; the map
// takes every geolocated row at once. They are two requests rather than one
// payload because a map redraw and a page turn happen at different times, and
// shipping 500 points to answer a page turn would be the larger waste.

function toFilters(request: FundingRequest): query.ProjectFilters {
    // An unparseable `years` drops the year filter rather than failing the
    // request — same rule as the projects service.
    const years = parseYearRange(request.years)

    return {
        corpus: request.c,
        ...(years ? {year: years} : {}),
        funder: request.funder,
        programme: request.programme,
        stream: request.stream,
        // Narrows to projects that involve at least one organisation in the
        // region. The rows are filtered again below — see `rank`.
        region: request.region,
    }
}

/** One ranked organisation before it becomes a DTO. */
interface RankedOrganisation extends FundingOrganisation {
    lat: number
    lng: number
}

export interface FundingRanking {
    organisations: RankedOrganisation[]
    capped: boolean
    complete: boolean
}

/**
 * The ranked organisations behind a project search, merged and sorted.
 *
 * Four steps, in this order for a reason:
 *  1. aggregate the top 500 by summed funding (one OpenSearch request);
 *  2. join names, regions and coordinates from the in-memory table (no I/O);
 *  3. drop rows outside the requested region — the project-level filter above
 *     keeps projects that TOUCH the region, so without this a Spanish partner
 *     would appear under "Northern Europe" because it worked with a Finn;
 *  4. merge duplicate institution records (D19) and re-sort, because two
 *     second-place records can outweigh a first.
 */
async function rank(request: FundingRequest): Promise<FundingRanking> {
    const buckets = await opensearchRepository.topFundedOrganisations(request.q ?? '', toFilters(request))

    // Without the table there are no names and no coordinates, so there is no
    // honest answer to give — better to say so than to render ids.
    if (!isOrganisationTableReady()) return {organisations: [], capped: false, complete: false}

    const rows = new Map(getOrganisations(buckets.map((bucket) => bucket.id)).map((row) => [row.id, row]))
    const regions = request.region?.length ? new Set(request.region) : null

    const groups = new Map<string, RankedOrganisation>()
    for (const bucket of buckets) {
        const row = rows.get(bucket.id)
        // An id with no organisation record cannot be named or placed.
        if (!row) continue
        if (regions && !(row.region && regions.has(row.region))) continue

        const key = row.nameKey ?? `id:${row.id}`
        const existing = groups.get(key)
        if (existing) {
            existing.fundingEur += bucket.fundingEur
            existing.projectCount += bucket.projectCount
            existing.mergedRecords += 1
            // A duplicate record may carry the coordinates the best-ranked one lacks.
            if (Number.isNaN(existing.lat) && !Number.isNaN(row.lat)) {
                existing.lat = row.lat
                existing.lng = row.lng
                existing.hasGeo = true
            }
            continue
        }

        groups.set(key, {
            id: row.id,
            name: row.name,
            country: row.country,
            region: row.region,
            fundingEur: bucket.fundingEur,
            projectCount: bucket.projectCount,
            mergedRecords: 1,
            hasGeo: !Number.isNaN(row.lat),
            lat: row.lat,
            lng: row.lng,
        })
    }

    const organisations = [...groups.values()].sort((a, b) => b.fundingEur - a.fundingEur)
    return {organisations, capped: buckets.length >= FUNDING_TOP_ORGANISATIONS, complete: true}
}

function toDto(organisation: RankedOrganisation): FundingOrganisation {
    const {lat: _lat, lng: _lng, ...dto} = organisation
    return dto
}

/** The blank, unfiltered view is the same answer for everyone — see common/search/defaultPageCache. */
function cacheKeyFor(request: FundingRequest, entity: string, page: number): string | null {
    return isDefaultRequest(request, page) ? defaultPageKey({entity, corpus: request.c, page, sort: undefined}) : null
}

export async function getFundingOrganisations(request: FundingRequest): Promise<FundingOrganisationsResponse> {
    const page = request.page ?? 1

    const cacheKey = cacheKeyFor(request, 'funding', page)
    if (cacheKey) {
        const cached = readDefaultPage<FundingOrganisationsResponse>(cacheKey)
        if (cached) return cached
    }

    const {organisations, capped, complete} = await rank(request)

    const from = (page - 1) * SEARCH_PAGE_SIZE
    if (from > 0 && from >= organisations.length) {
        throw new AppError(`Page ${page} is past the end of these ${organisations.length} organisations.`, 400)
    }

    const response: FundingOrganisationsResponse = {
        hits: organisations.slice(from, from + SEARCH_PAGE_SIZE).map(toDto),
        estimatedTotalHits: organisations.length,
        page,
        pageCount: Math.max(1, pageCountOf(organisations.length)),
        capped,
        geolocated: organisations.filter((organisation) => organisation.hasGeo).length,
        totalFundingEur: organisations.reduce((sum, organisation) => sum + organisation.fundingEur, 0),
        complete,
    }

    // Only the cacheable blank view is stored, and only once it is real: a
    // response built while the organisation table was still loading is empty,
    // and caching it would keep the page empty for an hour.
    if (cacheKey && complete) writeDefaultPage(cacheKey, response)
    return response
}

/**
 * Every geolocated organisation of the ranked set, as the smallest point a
 * map can draw. Not paginated: a map with 20 of its 500 points on it is not a
 * map, and the payload is small enough (~40 KB) to send whole.
 */
export async function getFundingMap(request: FundingRequest): Promise<FundingMapResponse> {
    const cacheKey = cacheKeyFor(request, 'funding:map', 1)
    if (cacheKey) {
        const cached = readDefaultPage<FundingMapResponse>(cacheKey)
        if (cached) return cached
    }

    const {organisations, complete} = await rank(request)

    const response: FundingMapResponse = {
        orgs: organisations
            .filter((organisation) => organisation.hasGeo)
            .map((organisation) => ({
                id: organisation.id,
                name: organisation.name,
                lat: organisation.lat,
                lng: organisation.lng,
                fundingEur: organisation.fundingEur,
                projectCount: organisation.projectCount,
            })),
        ranked: organisations.length,
        complete,
    }

    if (cacheKey && complete) writeDefaultPage(cacheKey, response)
    return response
}
