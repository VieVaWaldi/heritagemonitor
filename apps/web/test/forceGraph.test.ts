import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createSeededRng, detectCommunities} from '../src/common/deckgl/communities.ts'
import {fitOrthographicView, FORCE_TICKS, layoutForceGraph} from '../src/common/deckgl/forceLayout.ts'

const ring = (n: number) => ({
    nodes: Array.from({length: n}, (_, i) => ({id: `n${i}`})),
    links: Array.from({length: n}, (_, i) => ({source: `n${i}`, target: `n${(i + 1) % n}`})),
})

test('the layout is deterministic: same graph, same positions', () => {
    const {nodes, links} = ring(30)
    const first = layoutForceGraph(nodes, links)
    const second = layoutForceGraph(nodes, links)
    assert.deepEqual([...first.positions], [...second.positions])
    assert.equal(FORCE_TICKS, 300)
})

test('every node gets a finite position and a degree; bounds cover them', () => {
    const {nodes, links} = ring(12)
    const result = layoutForceGraph(nodes, links)
    assert.equal(result.positions.size, 12)
    for (const {x, y} of result.positions.values()) assert.ok(Number.isFinite(x) && Number.isFinite(y))
    assert.equal(result.degree.get('n0'), 2)
    assert.ok(result.bounds!.maxX > result.bounds!.minX)
})

test('linked nodes end up closer than the two ends of a long chain', () => {
    const nodes = Array.from({length: 10}, (_, i) => ({id: `c${i}`}))
    const links = nodes.slice(1).map((node, i) => ({source: `c${i}`, target: node.id}))
    const {positions} = layoutForceGraph(nodes, links)
    const distance = (a: string, b: string) => Math.hypot(positions.get(a)!.x - positions.get(b)!.x, positions.get(a)!.y - positions.get(b)!.y)
    assert.ok(distance('c0', 'c1') < distance('c0', 'c9'))
})

test('links to unknown nodes and self links are ignored; an empty graph has no bounds', () => {
    const result = layoutForceGraph([{id: 'a'}, {id: 'b'}], [{source: 'a', target: 'zzz'}, {source: 'a', target: 'a'}, {source: 'a', target: 'b'}])
    assert.equal(result.positions.size, 2)
    assert.equal(layoutForceGraph([], []).bounds, null)
})

test('the initial view fits the whole graph and centres it', () => {
    const view = fitOrthographicView({minX: -100, maxX: 300, minY: 0, maxY: 100})
    assert.deepEqual(view.target, [100, 50, 0])
    assert.ok(view.zoom < 1)
    assert.deepEqual(fitOrthographicView(null), {target: [0, 0, 0], zoom: 0})
})

test('communities: two cliques joined by a thin bridge are two communities, the same on every run', () => {
    const clique = (prefix: string) =>
        ['a', 'b', 'c', 'd'].flatMap((x, i, all) => all.slice(i + 1).map((y) => ({a: `${prefix}${x}`, b: `${prefix}${y}`, weight: 5})))
    const links = [...clique('x'), ...clique('y'), {a: 'xa', b: 'ya', weight: 1}]
    const first = detectCommunities(links)
    const second = detectCommunities(links)
    assert.deepEqual([...first], [...second])
    assert.equal(new Set(first.values()).size, 2)
    assert.equal(first.get('xa'), first.get('xd'))
    assert.notEqual(first.get('xa'), first.get('ya'))
})

test('the seeded generator repeats and stays in [0, 1)', () => {
    const one = createSeededRng(42)
    const two = createSeededRng(42)
    for (let i = 0; i < 20; i += 1) {
        const value = one()
        assert.equal(value, two())
        assert.ok(value >= 0 && value < 1)
    }
})
