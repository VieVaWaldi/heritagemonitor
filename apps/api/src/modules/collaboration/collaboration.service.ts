import type {query} from '@heritagemonitor/search'
import {
    MAX_URL_TOPICS,
    ORG_NETWORK_DEFAULT_MAX,
    QUERY_NETWORK_DEFAULT_MAX_EDGES,
    QUERY_NETWORK_PROJECTS_SCANNED,
    parseYearRange,
    type OrganisationNetworkRequest,
    type OrganisationNetworkResponse,
    type QueryNetworkRequest,
    type QueryNetworkResponse,
} from '@heritagemonitor/shared'
import {InMemoryCache} from '../../plugins/cache.js'
import {AppError} from '../../plugins/errors.js'
import {getOrganisation, getOrganisations, isOrganisationTableReady} from '../../reference/organisationTable.js'
import {buildOrganisationNetwork, type NetworkOrganisation} from './network.js'
import {buildQueryNetwork, countPairs, MAX_ORGS_PER_PROJECT, type ScannedProject} from './queryNetwork.js'
import * as opensearchRepository from './opensearch.repository.js'

// Service layer: who collaborates with one organisation. One aggregation for
// the partners, everything else from the in-memory organisation table — no
// mget, so a 500-partner network costs one request.

/** How long a blank-filter network is served before the index is asked again. */
const BLANK_NETWORK_TTL_MS = 10 * 60 * 1000
const blankNetworks = new InMemoryCache(100)

function toFilters(request: Omit<OrganisationNetworkRequest, 'max'>): query.ProjectFilters {
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

// --- the query network -------------------------------------------------------

/** Nothing but the corpus and the cap: the same answer for everyone. */
function isBlankQuery(request: QueryNetworkRequest): boolean {
    return !(request.q ?? '').trim() && isBlank({c: request.c, years: request.years, funder: request.funder, programme: request.programme, topic: request.topic, subfield: request.subfield, field: request.field})
}

/** What the database column looks like once read: ids arrive as strings, numbers, or not at all. */
function idsOf(value: unknown[] | undefined): string[] {
    return (value ?? []).map(String)
}

/**
 * Who works with whom inside a search's projects.
 *
 * Per request: ONE search over the projects index (top 2,000 by relevance,
 * two doc-value columns per hit, no `_source`), a lookup of the distinct
 * organisation ids in the in-memory table (no I/O), and pair counting in the
 * api. Cold cost is the search's (a few seconds on the VM); warm it is
 * ~150-200 ms, and the blank query per corpus is cached for ten minutes.
 */
export async function getQueryNetwork(request: QueryNetworkRequest): Promise<QueryNetworkResponse> {
    const maxEdges = request.maxEdges ?? QUERY_NETWORK_DEFAULT_MAX_EDGES
    const q = (request.q ?? '').trim()

    if (!isOrganisationTableReady()) {
        return {
            nodes: [],
            edges: [],
            meta: {projectsScanned: 0, totalMatches: 0, totalCapped: false, approxTotal: null, edgesFound: 0, capped: false, withoutGeo: 0, mode: 'strict', didYouMean: [], complete: false},
        }
    }

    const cacheKey = isBlankQuery(request) ? `query-network:${request.c ?? 'all'}:${maxEdges}` : null
    if (cacheKey) {
        const cached = blankNetworks.get<QueryNetworkResponse>(cacheKey)
        if (cached) return cached
    }

    const scan = await opensearchRepository.scanProjects({
        q,
        filters: toFilters(request),
        typoTolerant: q.length > 0,
    })

    const projects: ScannedProject[] = scan.hits.map((hit) => ({orgIds: idsOf(hit.fields.org_ids)}))
    const distinctIds = [...new Set(projects.flatMap((project) => project.orgIds.slice(0, MAX_ORGS_PER_PROJECT)))]
    const organisations = new Map(getOrganisations(distinctIds).map((row) => [row.id, toNetworkOrganisation(row)]))

    const counts = countPairs(projects, organisations, QUERY_NETWORK_PROJECTS_SCANNED)
    const payload = buildQueryNetwork({counts, organisations, maxEdges})

    const response: QueryNetworkResponse = {
        nodes: payload.nodes,
        edges: payload.edges,
        meta: {
            projectsScanned: projects.length,
            totalMatches: scan.total,
            totalCapped: scan.totalCapped,
            approxTotal: scan.approxTotal,
            edgesFound: payload.edgesFound,
            capped: payload.capped,
            withoutGeo: payload.withoutGeo,
            mode: scan.mode,
            didYouMean: scan.didYouMean,
            complete: true,
        },
    }

    if (cacheKey) blankNetworks.set(cacheKey, response, BLANK_NETWORK_TTL_MS)
    return response
}
