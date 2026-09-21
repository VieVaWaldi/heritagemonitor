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

import {queryNetworkBody, QUERY_NETWORK_SCAN} from '../dist/query/collaboration.js'

test('the query network scan reads two doc-value columns and never _source', () => {
    const body = queryNetworkBody({q: 'archaeology', filters: {corpus: 'dch'}}) as Record<string, unknown>
    assert.equal(body._source, false)
    assert.deepEqual(body.docvalue_fields, ['org_ids', 'coordinator_ids'])
    assert.equal(body.size, QUERY_NETWORK_SCAN)
    assert.equal(body.from, 0)
    assert.equal(body.sort, undefined, 'relevance is the default order of a text query')
})

test('a blank query ranks by budget, since it has no relevance', () => {
    const body = queryNetworkBody({q: '', filters: {}}) as {sort: unknown[]}
    assert.deepEqual(body.sort[0], {funded_amount_eur: {order: 'desc', missing: '_last'}})
})

test('the fuzzy rerun keeps the doc-value shape and can ask for suggestions', () => {
    const body = queryNetworkBody({q: 'archeology', filters: {}, mode: 'fuzzy', suggest: true, timeout: '2s'}) as Record<string, unknown>
    assert.equal(body._source, false)
    assert.ok(body.suggest)
    assert.equal(body.timeout, '2s')
})
