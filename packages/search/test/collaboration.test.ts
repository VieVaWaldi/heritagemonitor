import assert from 'node:assert/strict'
import {test} from 'node:test'
import {orgNetworkBody} from '../dist/query/collaboration.js'

type Body = {size: number; query: {bool: {filter: unknown[]}}; aggs: {partners: {terms: {field: string; size: number}}}}

test('the network query is one size-0 request: term on the centre, terms agg over org_ids (max + 1)', () => {
    const body = orgNetworkBody('org-1', {}, 500) as Body
    assert.equal(body.size, 0)
    assert.deepEqual(body.query.bool.filter, [{term: {org_ids: 'org-1'}}])
    assert.equal(body.aggs.partners.terms.field, 'org_ids')
    assert.equal(body.aggs.partners.terms.size, 501)
})

test('the project filters narrow the projects going into the network', () => {
    const body = orgNetworkBody('org-1', {corpus: 'dch', year: {from: 2019, to: 2025}, funder: ['EC']}, 50) as Body
    const filters = JSON.stringify(body.query.bool.filter)
    assert.ok(filters.includes('"is_ch":true'))
    assert.ok(filters.includes('"gte":2019'))
    assert.ok(filters.includes('"funder":["EC"]'))
    assert.ok(filters.includes('{"term":{"org_ids":"org-1"}}'))
})
