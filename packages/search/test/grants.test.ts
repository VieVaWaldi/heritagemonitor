import assert from 'node:assert/strict'
import {test} from 'node:test'
// Tests run against the compiled `dist/` (the `test` script builds first).
import {grantAutocompleteBody, grantFilters, grantsBody, grantsCountBody} from '../dist/query/grants.js'

test('the DCH corpus filters streams on dch_project_count', () => {
    assert.deepEqual(grantFilters({corpus: 'dch'}), [{range: {dch_project_count: {gte: 1}}}])
    assert.deepEqual(grantFilters({corpus: 'science'}), [])
})

test('filter names map to the index field names', () => {
    assert.deepEqual(grantFilters({funder: ['EC'], programme: ['H2020'], jurisdiction: ['EU']}), [
        {terms: {funder: ['EC']}},
        {terms: {programme: ['H2020']}},
        {terms: {jurisdiction: ['EU']}},
    ])
})

test('the funder-name filter matches the NAME field, not the code', () => {
    // Backs the funder facet's type-ahead: its buckets are codes (`EC`), what
    // the user types is a name ("European Commission").
    assert.deepEqual(grantFilters({funderName: 'European Com'}), [{match_bool_prefix: {funder_name: 'European Com'}}])
})

test('a blank or whitespace funder name adds no clause', () => {
    assert.deepEqual(grantFilters({funderName: '   '}), [])
    assert.deepEqual(grantFilters({}), [])
})

test('a deep link restricts to ids', () => {
    assert.deepEqual(grantFilters({only: ['EC::H2020']}), [{ids: {values: ['EC::H2020']}}])
})

test('a blank query is ordered by heritage projects, not by money', () => {
    // The streams that moved the most euro are national research councils
    // whose heritage share is marginal; ordering by funding would give them
    // the first pages of a heritage monitor.
    const body = grantsBody({size: 20, from: 0})
    assert.deepEqual(body.sort, [
        {dch_project_count: {order: 'desc', missing: '_last'}},
        {dch_project_count: 'desc'},
        {project_count: 'desc'},
    ])
})

test('a text query with no explicit sort is ranked by relevance (no sort clause)', () => {
    assert.equal(grantsBody({q: 'heritage', size: 20, from: 0}).sort, undefined)
})

test('an explicit sort wins over both, and puts missing amounts last', () => {
    const body = grantsBody({q: 'heritage', size: 20, from: 0, sort: 'funding'})
    // Over half the streams report no amount; without `missing: _last` they
    // would lead a "highest funding first" list.
    assert.deepEqual((body.sort as unknown[])[0], {total_funded_eur: {order: 'desc', missing: '_last'}})
})

test('relevance with a blank query still falls back to the default order', () => {
    // BM25 has nothing to rank on without query text, so "relevance" there
    // would be an arbitrary all-equal order. Same rule as organisationsBody.
    assert.deepEqual(grantsBody({size: 20, from: 0, sort: 'relevance'}).sort, grantsBody({size: 20, from: 0}).sort)
})

test('the count body carries the same filters and no paging', () => {
    const body = grantsCountBody({q: 'heritage', filters: {corpus: 'dch', funder: ['EC']}}) as {
        query: {bool: {filter: unknown[]}}
    }
    assert.deepEqual(body.query.bool.filter, [{range: {dch_project_count: {gte: 1}}}, {terms: {funder: ['EC']}}])
    assert.equal('size' in body, false)
})

test('autocomplete only ever suggests streams that funded heritage work', () => {
    // Suggesting one of the ~4,500 programmes with no link to the corpus could
    // only ever lead to an empty page.
    const body = grantAutocompleteBody('horiz') as {query: {bool: {filter: unknown[]}}}
    assert.deepEqual(body.query.bool.filter, [{range: {dch_project_count: {gte: 1}}}])
})
