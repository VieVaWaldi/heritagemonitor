import type {NetworkNode, QueryNetworkResponse} from '@heritagemonitor/shared'
// Relative, with extensions where a value is imported: unit tested by Node's
// own runner (test/queryNetwork.test.ts). Types are erased.
import {SEARCH_PARAM} from '../../../common/url/codecs.ts'
import type {ArcNetworkLink, ArcNetworkNode} from '../../../common/deckgl/layers/arcNetworkLayer.ts'
import {relatedParams} from '../entity/relatedParams.ts'
import {formatShared, sharedProjectsPath} from './networkAdapter.ts'

// ADAPTER: the query network payload -> the list beside the graph, the arc
// layer's shapes, the force graph's inputs and the requests the tabs make.
// Pure functions only.

/**
 * The query string of the network request AND of the project lists inside it:
 * q, the corpus and the project filters — exactly what the
 * `collaboration:queryNetwork` relation carries (entity/relatedParams).
 */
export function queryNetworkFilterQuery(params: URLSearchParams): string {
    return relatedParams('collaboration:queryNetwork', params).toString()
}

export const queryNetworkPath = (filterQuery: string, maxEdges: number) => {
    const query = new URLSearchParams(filterQuery)
    query.set(SEARCH_PARAM.maxEdges, String(maxEdges))
    return `/v1/collaboration/query-network?${query.toString()}`
}

/** The matching projects themselves (the third tab). */
export const matchingProjectsPath = (filterQuery: string, page: number) => {
    const query = new URLSearchParams(filterQuery)
    query.set('page', String(page))
    return `/v1/projects/search?${query.toString()}`
}

export interface QueryEdge {
    /** Stable id, also the `sel` value: the two representative organisation ids. */
    id: string
    a: NetworkNode
    b: NetworkNode
    /** Shared projects among the scanned ones. */
    w: number
}

export const edgeId = (a: NetworkNode, b: NetworkNode) => `${a.id}:${b.id}`

/** The edges as the list shows them: strongest first, as the api ranked them. */
export function queryEdges(network: QueryNetworkResponse): QueryEdge[] {
    return network.edges.flatMap((edge) => {
        const a = network.nodes[edge.a]
        const b = network.nodes[edge.b]
        return a && b ? [{id: edgeId(a, b), a, b, w: edge.w}] : []
    })
}

/** The edge `sel` names, or null: an unknown id (stale link, cap lowered) falls back to the caller's default. */
export function findEdge(edges: readonly QueryEdge[], selection: string | null): QueryEdge | null {
    if (!selection) return null
    return edges.find((edge) => edge.id === selection) ?? null
}

/** The projects both organisations of an edge took part in, under the page's q and filters. */
export const edgeProjectsPath = (edge: QueryEdge, page: number, filterQuery: string) => sharedProjectsPath(edge.a.id, edge.b.ids, page, filterQuery)

/** Arc layer inputs: only edges whose two ends have coordinates can be drawn on a map. */
export function edgeArcLinks(edges: readonly QueryEdge[]): ArcNetworkLink[] {
    return edges.flatMap((edge) =>
        edge.a.lat !== null && edge.a.lng !== null && edge.b.lat !== null && edge.b.lng !== null
            ? [{id: edge.id, source: [edge.a.lng, edge.a.lat] as [number, number], target: [edge.b.lng, edge.b.lat] as [number, number], weight: edge.w}]
            : [],
    )
}

export function edgeArcNodes(network: QueryNetworkResponse, edges: readonly QueryEdge[]): ArcNetworkNode[] {
    const degree = new Map<string, number>()
    for (const edge of edges) {
        degree.set(edge.a.id, (degree.get(edge.a.id) ?? 0) + 1)
        degree.set(edge.b.id, (degree.get(edge.b.id) ?? 0) + 1)
    }
    return network.nodes.flatMap((node) =>
        node.lat !== null && node.lng !== null ? [{id: node.id, geolocation: [node.lng, node.lat] as [number, number], linkCount: degree.get(node.id) ?? 1}] : [],
    )
}

export const QUERY_LIST_PAGE_SIZE = 20

export function edgeSubtitle(edge: QueryEdge): string {
    const countries = [edge.a.countryCode, edge.b.countryCode].filter(Boolean)
    return [formatShared(edge.w), countries.length ? countries.join(' – ') : null].filter(Boolean).join(' · ')
}

/** '- A <-> B (N shared projects)': the line Lucy reads for an edge. */
export function edgeChatRow(edge: QueryEdge): string {
    return `- ${edge.a.name} <-> ${edge.b.name} (${formatShared(edge.w)})`
}

/** "based on the top 2,000 of about 25,797 matching projects" — said out loud beside the graph. */
export function basisNote(meta: QueryNetworkResponse['meta']): string {
    const scanned = meta.projectsScanned.toLocaleString('en-US')
    const total = meta.totalCapped ? (meta.approxTotal ?? meta.totalMatches) : meta.totalMatches
    if (meta.projectsScanned >= total && !meta.totalCapped) return `Based on all ${scanned} matching projects.`
    return `Based on the top ${scanned} of ${meta.totalCapped && meta.approxTotal === null ? 'more than ' : 'about '}${total.toLocaleString('en-US')} matching projects.`
}
