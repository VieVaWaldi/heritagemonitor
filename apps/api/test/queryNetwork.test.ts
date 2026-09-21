import assert from 'node:assert/strict'
import {test} from 'node:test'
import type {NetworkOrganisation} from '../dist/modules/collaboration/network.js'
import {buildQueryNetwork, countPairs, MAX_ORGS_PER_PROJECT, topEdges} from '../dist/modules/collaboration/queryNetwork.js'

const org = (id: string, nameKey: string | null = `k${id}`, lat = 50, lng = 8): NetworkOrganisation => ({
    id,
    name: `Org ${id}`,
    nameKey,
    lat,
    lng,
    country: 'DE',
})
const table = (...orgs: NetworkOrganisation[]) => new Map(orgs.map((o) => [o.id, o]))
const project = (...orgIds: string[]) => ({orgIds})

test('a pair is counted once per shared project; single-organisation projects add nothing', () => {
    const organisations = table(org('a'), org('b'), org('c'))
    const {pairs} = countPairs([project('a', 'b'), project('a', 'b', 'c'), project('a')], organisations, 2000)
    const weights = Object.fromEntries(pairs.map((p) => [`${p.a}-${p.b}`, p.weight]))
    assert.deepEqual(weights, {'ka-kb': 2, 'ka-kc': 1, 'kb-kc': 1})
})

test('records of one institution fold together: no self-pair, and its two ids make one edge', () => {
    const organisations = table(org('a1', 'ka'), org('a2', 'ka'), org('b'))
    const {pairs, institutions} = countPairs([project('a1', 'a2', 'b'), project('a2', 'b')], organisations, 2000)
    assert.equal(pairs.length, 1)
    assert.equal(pairs[0].weight, 2)
    assert.deepEqual(institutions.get('ka')!.ids, ['a1', 'a2'])
})

test('only the first 30 organisations of a project are used', () => {
    const many = Array.from({length: 45}, (_, i) => `o${i}`)
    const organisations = table(...many.map((id) => org(id)))
    const {pairs} = countPairs([project(...many)], organisations, 2000)
    assert.equal(MAX_ORGS_PER_PROJECT, 30)
    assert.equal(pairs.length, (30 * 29) / 2)
})

test('ids without an organisation record are skipped', () => {
    const {pairs} = countPairs([project('a', 'ghost', 'b')], table(org('a'), org('b')), 2000)
    assert.equal(pairs.length, 1)
})

test('the cap keeps the strongest pairs; ties go to the pair whose projects ranked higher', () => {
    const organisations = table(org('a'), org('b'), org('c'), org('d'), org('e'), org('f'))
    // position 0 is the best-ranked project.
    const projects = [project('a', 'b'), project('c', 'd'), project('e', 'f'), project('c', 'd'), project('e', 'f'), project('a', 'b')]
    // a-b: weight 2 at positions 0 and 5; c-d: weight 2 at 1 and 3; e-f: weight 2 at 2 and 4.
    const {pairs} = countPairs(projects, organisations, 2000)
    const kept = topEdges(pairs, 2)
    // rank scores: a-b = (2000-0)+(2000-5)=3995, c-d = 1999+1997=3996, e-f = 1998+1996=3994
    assert.deepEqual(kept.map((p) => `${p.a}-${p.b}`), ['kc-kd', 'ka-kb'])
})

test('a heavier pair always beats a better-ranked lighter one', () => {
    const organisations = table(org('a'), org('b'), org('c'), org('d'))
    const projects = [project('a', 'b'), project('c', 'd'), project('c', 'd')]
    const kept = topEdges(countPairs(projects, organisations, 2000).pairs, 1)
    assert.equal(`${kept[0].a}-${kept[0].b}`, 'kc-kd')
})

test('the result does not depend on the order pairs were found in', () => {
    const organisations = table(org('a'), org('b'), org('c'))
    const forward = topEdges(countPairs([project('a', 'b'), project('b', 'c')], organisations, 10).pairs, 5)
    const reversed = topEdges([...countPairs([project('a', 'b'), project('b', 'c')], organisations, 10).pairs].reverse(), 5)
    assert.deepEqual(forward.map((p) => p.a + p.b), reversed.map((p) => p.a + p.b))
})

test('the payload: nodes are the endpoints of the kept edges only, hubs first; edges are index pairs', () => {
    const organisations = table(org('a'), org('b'), org('c', 'kc', NaN, NaN), org('d'))
    const counts = countPairs([project('a', 'b'), project('a', 'b'), project('a', 'c'), project('c', 'd')], organisations, 2000)
    const payload = buildQueryNetwork({counts, organisations, maxEdges: 2})
    assert.deepEqual(payload.nodes.map((n) => n.id), ['a', 'b', 'c'])
    assert.deepEqual(payload.edges, [
        {a: 0, b: 1, w: 2},
        {a: 0, b: 2, w: 1},
    ])
    assert.equal(payload.edgesFound, 3)
    assert.equal(payload.capped, true)
    assert.equal(payload.withoutGeo, 1)
    assert.equal(payload.nodes[2].lat, null)
})

test('a duplicate record with coordinates places an institution whose representative has none', () => {
    const organisations = table(org('a1', 'ka', NaN, NaN), org('a2', 'ka', 48.8, 2.3), org('b'))
    const counts = countPairs([project('a1', 'b'), project('a2', 'b')], organisations, 2000)
    const payload = buildQueryNetwork({counts, organisations, maxEdges: 10})
    const node = payload.nodes.find((n) => n.id === 'a1')!
    assert.equal(node.lat, 48.8)
    assert.equal(node.w, 2)
    assert.equal(payload.capped, false)
})
