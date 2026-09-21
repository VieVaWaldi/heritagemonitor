import Graph from 'graphology'
import louvain from 'graphology-communities-louvain'

// Louvain community detection over a weighted collaboration graph, for node
// colours: organisations that mostly work with each other share a colour.
//
// Ported from digicher_webinterface's useCommunityDetection, minus React.

export interface CommunityLink {
    a: string
    b: string
    weight: number
}

/**
 * Deterministic PRNG (mulberry32). Louvain breaks ties randomly by default, so
 * two calls on the same graph could colour it differently; a fixed seed,
 * freshly instantiated per call, makes every caller agree.
 */
export function createSeededRng(seed: number): () => number {
    let state = seed >>> 0
    return () => {
        state = (state + 0x6d2b79f5) | 0
        let t = Math.imul(state ^ (state >>> 15), 1 | state)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

const COMMUNITY_SEED = 42

/** node id -> community id. A community of one is an organisation with no partner in this graph. */
export function detectCommunities(links: readonly CommunityLink[]): Map<string, number> {
    if (links.length === 0) return new Map()

    const graph = new Graph({type: 'undirected', multi: false, allowSelfLoops: false})
    for (const link of links) {
        if (link.a === link.b) continue
        if (!graph.hasNode(link.a)) graph.addNode(link.a)
        if (!graph.hasNode(link.b)) graph.addNode(link.b)
        if (graph.hasEdge(link.a, link.b)) graph.updateEdgeAttribute(link.a, link.b, 'weight', (w) => (typeof w === 'number' ? w + link.weight : link.weight))
        else graph.addEdge(link.a, link.b, {weight: link.weight})
    }
    if (graph.order === 0) return new Map()

    const communities = louvain(graph, {getEdgeWeight: 'weight', rng: createSeededRng(COMMUNITY_SEED)})
    return new Map(Object.entries(communities).map(([id, community]) => [id, Number(community)]))
}

/**
 * A categorical colour for a community id. Golden-angle hue rotation keeps
 * neighbouring ids visually distinct however many communities there are.
 */
export function communityColor(id: number): [number, number, number] {
    const hue = (((id * 137.508) % 360) + 360) % 360
    return hslToRgb(hue, 0.55, 0.5)
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = l - c / 2
    let r = 0
    let g = 0
    let b = 0
    if (h < 60) [r, g, b] = [c, x, 0]
    else if (h < 120) [r, g, b] = [x, c, 0]
    else if (h < 180) [r, g, b] = [0, c, x]
    else if (h < 240) [r, g, b] = [0, x, c]
    else if (h < 300) [r, g, b] = [x, 0, c]
    else [r, g, b] = [c, 0, x]
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}
