import {forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, type SimulationLinkDatum, type SimulationNodeDatum} from 'd3-force'

// A force-directed layout of a collaboration graph: nodes pulled together by
// their links and pushed apart, laid out by CONNECTIVITY instead of geography.
//
// Ported from digicher_webinterface's useForceLayout, minus React: a plain
// function that returns positions, so it can be unit-tested and so no page has
// to import d3 (apps/web/RULES.md #4 — third-party libraries stay wrapped in
// common/deckgl).
//
// Static on purpose: the simulation is stopped and stepped a fixed number of
// times synchronously. No animation loop, nothing to clean up, and — because
// the seed is a circle and d3-force's own random source is a fixed-seed LCG —
// the same graph always lays out the same way.

/** Ticks run up front. Enough for a few hundred nodes to settle. */
export const FORCE_TICKS = 300
/** Radius of the circle the nodes start on: a non-degenerate start speeds convergence and avoids overlap. */
const SEED_RADIUS = 200
const LINK_DISTANCE = 50
const LINK_STRENGTH = 0.15
const CHARGE_STRENGTH = -60

export interface ForceInputNode {
    id: string
}

export interface ForceInputLink {
    source: string
    target: string
    /** Pull between the two ends, 0..1. Defaults to a gentle uniform pull; a caller that wants groups to hold together gives links inside a group more. */
    strength?: number
}

export interface ForceLayoutResult {
    /** Position per node id. */
    positions: Map<string, {x: number; y: number}>
    /** Distinct neighbours per node id. */
    degree: Map<string, number>
    /** Extent of the laid-out nodes, for fitting the initial view. Null for an empty graph. */
    bounds: {minX: number; maxX: number; minY: number; maxY: number} | null
}

interface SimNode extends SimulationNodeDatum {
    id: string
    degree: number
}

export function layoutForceGraph(nodes: readonly ForceInputNode[], links: readonly ForceInputLink[], ticks = FORCE_TICKS): ForceLayoutResult {
    if (nodes.length === 0) return {positions: new Map(), degree: new Map(), bounds: null}

    const neighbours = new Map<string, Set<string>>(nodes.map((node) => [node.id, new Set<string>()]))
    for (const link of links) {
        neighbours.get(link.source)?.add(link.target)
        neighbours.get(link.target)?.add(link.source)
    }

    const simNodes: SimNode[] = nodes.map((node, index) => {
        const angle = (index / nodes.length) * Math.PI * 2
        return {id: node.id, degree: neighbours.get(node.id)!.size, x: Math.cos(angle) * SEED_RADIUS, y: Math.sin(angle) * SEED_RADIUS}
    })
    const known = new Set(nodes.map((node) => node.id))
    const simLinks: Array<SimulationLinkDatum<SimNode> & {source: string; target: string; strength?: number}> = links
        .filter((link) => known.has(link.source) && known.has(link.target) && link.source !== link.target)
        .map((link) => ({source: link.source, target: link.target, strength: link.strength}))

    const simulation = forceSimulation(simNodes)
        .force('link', forceLink<SimNode, (typeof simLinks)[number]>(simLinks).id((node) => node.id).distance(LINK_DISTANCE).strength((link) => link.strength ?? LINK_STRENGTH))
        .force('charge', forceManyBody().strength(CHARGE_STRENGTH))
        .force('center', forceCenter(0, 0))
        .force('collide', forceCollide<SimNode>((node) => collideRadius(node.degree)))
        .stop()
    for (let i = 0; i < ticks; i += 1) simulation.tick()

    const positions = new Map(simNodes.map((node) => [node.id, {x: node.x ?? 0, y: node.y ?? 0}]))
    const xs = simNodes.map((node) => node.x ?? 0)
    const ys = simNodes.map((node) => node.y ?? 0)
    return {
        positions,
        degree: new Map(simNodes.map((node) => [node.id, node.degree])),
        bounds: {minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys)},
    }
}

/** A node's on-screen radius grows with how connected it is (the drawn radius is `nodeRadius`). */
export function collideRadius(degree: number): number {
    return 5 + Math.sqrt(degree) * 2.5
}

export function nodeRadius(degree: number): number {
    return 4 + Math.sqrt(degree) * 2.5
}

/** The OrthographicView state that shows the whole graph. `viewportSize` is the on-screen size the graph should fit in. */
export function fitOrthographicView(bounds: ForceLayoutResult['bounds'], viewportSize = 700): {target: [number, number, number]; zoom: number} {
    if (!bounds) return {target: [0, 0, 0], zoom: 0}
    const width = Math.max(bounds.maxX - bounds.minX, 1)
    const height = Math.max(bounds.maxY - bounds.minY, 1)
    return {
        target: [(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2, 0],
        zoom: Math.log2(viewportSize / Math.max(width, height)) - 0.3,
    }
}

/**
 * The circle around a group of nodes: their centre and the distance to the
 * furthest one, plus `padding`. Drawn behind the nodes as the group's "blob".
 */
export function blobOf(positions: ReadonlyMap<string, {x: number; y: number}>, ids: readonly string[], padding = 30): {x: number; y: number; radius: number} | null {
    const points = ids.flatMap((id) => {
        const point = positions.get(id)
        return point ? [point] : []
    })
    if (points.length === 0) return null
    const x = points.reduce((sum, point) => sum + point.x, 0) / points.length
    const y = points.reduce((sum, point) => sum + point.y, 0) / points.length
    return {x, y, radius: Math.max(...points.map((point) => Math.hypot(point.x - x, point.y - y))) + padding}
}
