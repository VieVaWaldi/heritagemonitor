import type {query} from '@heritagemonitor/search'
import {
    MAX_URL_TOPICS,
    ORG_NETWORK_DEFAULT_MAX,
    parseYearRange,
    type OrganisationNetworkRequest,
    type OrganisationNetworkResponse,
} from '@heritagemonitor/shared'
import {InMemoryCache} from '../../plugins/cache.js'
import {AppError} from '../../plugins/errors.js'
import {getOrganisation, getOrganisations, isOrganisationTableReady} from '../../reference/organisationTable.js'
import {buildOrganisationNetwork, type NetworkOrganisation} from './network.js'
import * as opensearchRepository from './opensearch.repository.js'

// Service layer: who collaborates with one organisation. One aggregation for
// the partners, everything else from the in-memory organisation table — no
// mget, so a 500-partner network costs one request.

/** How long a blank-filter network is served before the index is asked again. */
const BLANK_NETWORK_TTL_MS = 10 * 60 * 1000
const blankNetworks = new InMemoryCache(100)

function toFilters(request: OrganisationNetworkRequest): query.ProjectFilters {
    const topicSelectionSize = (request.topic?.length ?? 0) + (request.subfield?.length ?? 0) + (request.field?.length ?? 0)
    if (topicSelectionSize > MAX_URL_TOPICS) {
        throw new AppError(`At most ${MAX_URL_TOPICS} topics can be selected at once (got ${topicSelectionSize}).`, 400)
    }
    const years = parseYearRange(request.years)
    return {
        corpus: request.c,
        ...(years ? {year: years} : {}),
        funder: request.funder,
        programme: request.programme,
        topic: request.topic,
        subfield: request.subfield,
        field: request.field,
    }
}

/** Nothing but the corpus and the cap: the same answer for everyone, worth holding. */
function isBlank(request: OrganisationNetworkRequest): boolean {
    return !request.years && !request.funder?.length && !request.programme?.length && !request.topic?.length && !request.subfield?.length && !request.field?.length
}

function toNetworkOrganisation(row: {id: string; name: string; nameKey: string | null; lat: number; lng: number; country: string | null}): NetworkOrganisation {
    return {id: row.id, name: row.name, nameKey: row.nameKey, lat: row.lat, lng: row.lng, country: row.country}
}

export async function getOrganisationNetwork(centreId: string, request: OrganisationNetworkRequest): Promise<OrganisationNetworkResponse> {
    const max = request.max ?? ORG_NETWORK_DEFAULT_MAX

    // Without the table there are no names or coordinates: say so rather than
    // draw ids (the page shows "still loading").
    if (!isOrganisationTableReady()) {
        return {nodes: [], edges: [], meta: {partners: 0, withoutGeo: 0, capped: false, complete: false}}
    }

    const centreRow = getOrganisation(centreId)
    if (!centreRow) throw new AppError(`Organisation '${centreId}' not found`, 404)

    const cacheKey = isBlank(request) ? `network:${centreId}:${request.c ?? 'all'}:${max}` : null
    if (cacheKey) {
        const cached = blankNetworks.get<OrganisationNetworkResponse>(cacheKey)
        if (cached) return cached
    }

    const buckets = await opensearchRepository.topPartners(centreId, toFilters(request), max)
    const organisations = new Map(getOrganisations(buckets.map((bucket) => bucket.id)).map((row) => [row.id, toNetworkOrganisation(row)]))

    const response = buildOrganisationNetwork({
        centre: toNetworkOrganisation(centreRow),
        centreProjects: buckets.find((bucket) => bucket.id === centreId)?.count ?? 0,
        buckets,
        organisations,
        max,
    })

    if (cacheKey) blankNetworks.set(cacheKey, response, BLANK_NETWORK_TTL_MS)
    return response
}
