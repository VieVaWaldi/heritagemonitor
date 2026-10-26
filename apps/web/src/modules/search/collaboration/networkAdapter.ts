import type {NetworkNode, OrganisationNetworkResponse} from '@heritagemonitor/shared'
// Relative, with extensions where a value is imported: this module is unit
// tested by Node's own runner (test/organisationNetwork.test.ts), which
// resolves neither `@/` nor extensionless paths. Types are erased.
import {SEARCH_PARAM} from '../../../common/url/codecs.ts'
import {relatedParams} from '../entity/relatedParams.ts'
import type {ArcNetworkLink, ArcNetworkNode} from '../../../common/deckgl/layers/arcNetworkLayer.ts'

// ADAPTER: the network payload -> the generic arc shapes in @/common/deckgl,
// the list beside the map, and the requests the tabs make. Pure functions
// only; the payload's compact shape (edges are index pairs) stops here.

/**
 * The query string of the network request AND of the project lists inside it:
 * the corpus and the project filters, nothing else — exactly what the
 * `collaboration:projects` relation carries (entity/relatedParams), so the
 * caption above the lists is generated from the same table. One string feeds
 * every request, so the number on an arc and the projects listed for it agree.
 */
export function networkFilterQuery(params: URLSearchParams): string {
    return relatedParams('collaboration:projects', params).toString()
}

/**
 * The URL patch for "make this organisation the centre": the new centre, no
 * selected partner (it belonged to the old network), no camera (the map flies
 * to the new centre instead of keeping one that framed somebody else) and the
 * MAP tab — a centre chosen from the Overview must not leave you reading the
 * old partner's tab. `dpage` is cleared by the same update (a tab change).
 */
export function centreOnPatch(id: string): Record<string, string | null> {
    return {[SEARCH_PARAM.center]: id, [SEARCH_PARAM.selection]: null, [SEARCH_PARAM.view]: null, [SEARCH_PARAM.tab]: 'map'}
}

export const networkPath = (centreId: string, filterQuery: string) =>
    `/v1/collaboration/organisations/${encodeURIComponent(centreId)}/network${filterQuery ? `?${filterQuery}` : ''}`

/** The projects BOTH organisations took part in: the centre AND any record of the partner. */
export const sharedProjectsPath = (centreId: string, partnerIds: readonly string[], page: number, filterQuery: string) => {
    const query = new URLSearchParams(filterQuery)
    query.set(SEARCH_PARAM.orgAll, centreId)
    for (const id of partnerIds) query.append('org', id)
    query.set('page', String(page))
    return `/v1/projects/search?${query.toString()}`
}

/** The centre's own projects under the same filters. */
export const centreProjectsPath = (centreId: string, page: number, filterQuery: string) => {
    const query = new URLSearchParams(filterQuery)
    query.set(SEARCH_PARAM.orgAll, centreId)
    query.set('page', String(page))
    return `/v1/projects/search?${query.toString()}`
}

export function centreOf(network: OrganisationNetworkResponse): NetworkNode | null {
    return network.nodes[0] ?? null
}

const positionOf = (node: NetworkNode): [number, number] | null =>
    node.lat === null || node.lng === null ? null : [node.lng, node.lat]

/** One arc per partner, from the centre. None when the centre has no coordinates. */
export function arcLinks(network: OrganisationNetworkResponse): ArcNetworkLink[] {
    const centre = centreOf(network)
    const source = centre ? positionOf(centre) : null
    if (!centre || !source) return []

    return network.edges.flatMap((edge) => {
        const partner = network.nodes[edge.b]
        const target = partner ? positionOf(partner) : null
        return partner && target ? [{id: partner.id, source, target, weight: edge.w}] : []
    })
}

/** One icon per drawn organisation; the centre reads as the hub. */
export function arcNodes(network: OrganisationNetworkResponse): ArcNetworkNode[] {
    return network.nodes.flatMap((node, index) => {
        const geolocation = positionOf(node)
        return geolocation ? [{id: node.id, geolocation, linkCount: index === 0 ? network.nodes.length - 1 : 1}] : []
    })
}

export const NETWORK_LIST_PAGE_SIZE = 20

export function pageOf<T>(items: readonly T[], page: number, size = NETWORK_LIST_PAGE_SIZE): T[] {
    const start = (Math.max(1, page) - 1) * size
    return items.slice(start, start + size)
}

export function pageCountOf(total: number, size = NETWORK_LIST_PAGE_SIZE): number {
    return Math.max(1, Math.ceil(total / size))
}

/** "3 shared projects" / "1 shared project". */
export function formatShared(count: number): string {
    return `${count.toLocaleString('en-US')} shared project${count === 1 ? '' : 's'}`
}

/** The second line of a list row. The centre's number is its own projects, not shared ones. */
export function nodeSubtitle(node: NetworkNode, isCentre: boolean): string {
    const count = isCentre ? `${node.w.toLocaleString('en-US')} project${node.w === 1 ? '' : 's'}` : formatShared(node.w)
    return [node.countryCode, count].filter(Boolean).join(' · ')
}

/** The line Lucy reads for a partner: '- partner (country, N shared projects)'. */
export function partnerChatRow(node: NetworkNode): string {
    return `- [${node.id}] ${node.name} (${[node.countryCode, formatShared(node.w)].filter(Boolean).join(', ')})`
}

/** The node an id belongs to — its representative id or any merged duplicate. */
export function findNode(network: OrganisationNetworkResponse, id: string | null): NetworkNode | null {
    if (!id) return null
    return network.nodes.find((node) => node.id === id || node.ids.includes(id)) ?? null
}
