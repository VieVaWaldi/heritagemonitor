import assert from 'node:assert/strict'
import {test} from 'node:test'
// Tests run against the compiled `dist/` (the `test` script builds first), not
// `src/`: this package ships ESM with explicit `.js` specifiers, which Node's
// own TypeScript support does not rewrite back to `.ts`. Testing the built
// entry points is also what every consumer actually imports.
import {termsAgg, toFacetDistribution} from '../dist/query/aggregations.js'
import {MAX_RESULT_WINDOW, pageWindow, totalOf} from '../dist/query/pagination.js'
import {projectFilters, projectsBody} from '../dist/query/projects.js'

test('pageWindow stays inside the 10,000 result window', () => {
    assert.deepEqual(pageWindow(1, 20), {from: 0, size: 20})
    assert.deepEqual(pageWindow(500, 20), {from: 9_980, size: 20})
    // Page 501 starts at 10,000 — the api answers 400 rather than an empty page.
    assert.equal(pageWindow(501, 20), null)
    assert.equal(pageWindow(1_000_000, 20), null)
    // A page that starts inside the window but would end past it is truncated.
    assert.deepEqual(pageWindow(2, MAX_RESULT_WINDOW - 10), {from: MAX_RESULT_WINDOW - 10, size: 10})
})

test('totalOf reports whether the count is exact or a floor', () => {
    assert.deepEqual(totalOf({hits: {total: {value: 42, relation: 'eq'}}}), {value: 42, capped: false})
    assert.deepEqual(totalOf({hits: {total: {value: 10_000, relation: 'gte'}}}), {value: 10_000, capped: true})
})

test('termsAgg always sets an explicit shard_size', () => {
    assert.deepEqual(termsAgg('topic_id', 25), {terms: {field: 'topic_id', size: 25, shard_size: 500}})
    assert.deepEqual(termsAgg('org_ids', 500, {shardSize: 2_000, order: {funding: 'desc'}}), {
        terms: {field: 'org_ids', size: 500, shard_size: 2_000, order: {funding: 'desc'}},
    })
})

test('toFacetDistribution flattens buckets, booleans included', () => {
    assert.deepEqual(
        toFacetDistribution({
            funder: {buckets: [{key: 'EC', doc_count: 5}]},
            is_ch: {buckets: [{key: 1, key_as_string: 'true', doc_count: 3}]},
        }),
        {funder: {EC: 5}, is_ch: {true: 3}},
    )
})

test('no filters means no filter clauses', () => {
    assert.deepEqual(projectFilters(), [])
    assert.deepEqual(projectFilters({corpus: 'science'}), [])
})

test('the DCH corpus filters on is_ch', () => {
    assert.deepEqual(projectFilters({corpus: 'dch'}), [{term: {is_ch: true}}])
})

test('list filters are OR (terms), orgAll is AND (one term each)', () => {
    assert.deepEqual(projectFilters({org: ['a', 'b']}), [{terms: {org_ids: ['a', 'b']}}])
    assert.deepEqual(projectFilters({orgAll: ['a', 'b']}), [{term: {org_ids: 'a'}}, {term: {org_ids: 'b'}}])
})

test('only=<id> matches by _id, never by the id field', () => {
    // works.id is `index: false`, so a terms query on the field silently
    // matches nothing there — `ids` works on every index.
    assert.deepEqual(projectFilters({only: ['123']}), [{ids: {values: ['123']}}])
})

test('empty filter lists are dropped rather than sent as empty terms', () => {
    assert.deepEqual(projectFilters({funder: [], programme: [], only: [], orgAll: []}), [])
})

test('projectsBody caps the total count and only sorts when asked', () => {
    const relevance = projectsBody({q: 'heritage', size: 20, from: 0, sort: 'relevance'})
    assert.equal(relevance.track_total_hits, 10_000)
    assert.equal('sort' in relevance, false)

    const budget = projectsBody({q: '', size: 20, from: 40, sort: 'budget', filters: {corpus: 'dch'}})
    assert.deepEqual(budget.sort, [{funded_amount_eur: {order: 'desc', missing: '_last'}}, '_score'])
    assert.deepEqual(budget.query, {
        bool: {must: {match_all: {}}, filter: [{term: {is_ch: true}}]},
    })
    assert.equal(budget.from, 40)
})
