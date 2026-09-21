import assert from 'node:assert/strict'
import {test} from 'node:test'
import {buildOrganisationNetwork, mergePartners, type NetworkOrganisation} from '../dist/modules/collaboration/network.js'

const org = (id: string, name: string, nameKey: string | null, lat = 50, lng = 8, country = 'DE'): NetworkOrganisation => ({
    id,
    name,
    nameKey,
    lat,
    lng,
    country,
})
const table = (...orgs: NetworkOrganisation[]) => new Map(orgs.map((o) => [o.id, o]))

const centre = org('c1', 'Fraunhofer', 'fraunhofer|de')

test('the centre and its own duplicate records are never partners (D19)', () => {
    const organisations = table(centre, org('c2', 'Fraunhofer Gesellschaft', 'fraunhofer|de'), org('p1', 'TU Berlin', 'tub|de'))
    const merged = mergePartners(
        [
            {id: 'c1', count: 900},
            {id: 'c2', count: 400},
            {id: 'p1', count: 30},
        ],
        organisations,
        centre,
    )
    assert.deepEqual(
        merged.map((partner) => partner.id),
        ['p1'],
    )
})

test('duplicate records of one partner are one node with summed weight and all ids', () => {
    const organisations = table(centre, org('p1', 'CNRS', 'cnrs|fr'), org('p2', 'CNRS Paris', 'cnrs|fr'), org('p3', 'TU Berlin', 'tub|de'))
    const merged = mergePartners(
        [
            {id: 'p3', count: 50},
            {id: 'p1', count: 40},
            {id: 'p2', count: 20},
        ],
        organisations,
        centre,
    )
    assert.equal(merged[0].id, 'p1')
    assert.equal(merged[0].count, 60)
    assert.deepEqual(merged[0].ids, ['p1', 'p2'])
    assert.equal(merged[1].id, 'p3')
})

test('a duplicate with coordinates fills in for a representative without', () => {
    const organisations = table(centre, org('p1', 'CNRS', 'cnrs|fr', NaN, NaN), org('p2', 'CNRS Paris', 'cnrs|fr', 48.8, 2.3))
    const [partner] = mergePartners([{id: 'p1', count: 5}, {id: 'p2', count: 3}], organisations, centre)
    assert.equal(partner.lat, 48.8)
})

test('the payload: node 0 is the centre, edges go from it, undrawable partners are counted', () => {
    const organisations = table(centre, org('p1', 'A', 'a|x'), org('p2', 'B', 'b|x', NaN, NaN), org('p3', 'C', 'c|x'))
    const network = buildOrganisationNetwork({
        centre,
        centreProjects: 900,
        buckets: [
            {id: 'c1', count: 900},
            {id: 'p1', count: 30},
            {id: 'p2', count: 20},
            {id: 'p3', count: 10},
        ],
        organisations,
        max: 500,
    })
    assert.deepEqual(network.nodes.map((node) => node.id), ['c1', 'p1', 'p3'])
    assert.equal(network.nodes[0].w, 900)
    assert.deepEqual(network.edges, [
        {a: 0, b: 1, w: 30},
        {a: 0, b: 2, w: 10},
    ])
    assert.deepEqual(network.meta, {partners: 3, withoutGeo: 1, capped: false, complete: true})
})

test('a centre without coordinates has null position; the cap is reported', () => {
    const noGeo = org('c1', 'X', 'x|x', NaN, NaN)
    const organisations = table(noGeo, org('p1', 'A', 'a|x'), org('p2', 'B', 'b|x'))
    const network = buildOrganisationNetwork({
        centre: noGeo,
        centreProjects: 5,
        buckets: [
            {id: 'c1', count: 5},
            {id: 'p1', count: 4},
            {id: 'p2', count: 3},
        ],
        organisations,
        max: 1,
    })
    assert.equal(network.nodes[0].lat, null)
    assert.equal(network.nodes.length, 2)
    assert.equal(network.meta.capped, true)
})
