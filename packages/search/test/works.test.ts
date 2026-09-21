import assert from 'node:assert/strict'
import {test} from 'node:test'
// Tests run against the compiled `dist/` (the `test` script builds first).
import {workFilters, worksBody, worksCountBody} from '../dist/query/works.js'

test('the DCH corpus is a proxy on the linked project, not on the work', () => {
    assert.deepEqual(workFilters({corpus: 'dch'}), [{term: {is_ch_via_project: true}}])
    assert.deepEqual(workFilters({corpus: 'science'}), [])
})

test('only= goes through _id, because works.id is not indexed', () => {
    // `{terms: {id: [...]}}` would silently match nothing on this index.
    assert.deepEqual(workFilters({only: ['42']}), [{ids: {values: ['42']}}])
})

test('the reverse-lookup tabs are plain term filters', () => {
    assert.deepEqual(workFilters({project: ['p1']}), [{terms: {project_ids: ['p1']}}])
    assert.deepEqual(workFilters({org: ['o1', 'o2']}), [{terms: {organisation_ids: ['o1', 'o2']}}])
})

test('value filters map to their index fields', () => {
    assert.deepEqual(workFilters({oa: ['gold'], language: ['eng'], publisher: ['Elsevier BV'], year: {from: 2019, to: 2025}}), [
        {range: {year: {gte: 2019, lte: 2025}}},
        {terms: {open_access_color: ['gold']}},
        {terms: {language: ['eng']}},
        {terms: {publisher: ['Elsevier BV']}},
    ])
})

test('citations sorts on the count; relevance keeps it as the tie-break', () => {
    assert.deepEqual(worksBody({q: 'heritage', size: 20, from: 0, sort: 'citations'}).sort, [{citation_count: 'desc'}])
    assert.deepEqual(worksBody({q: 'heritage', size: 20, from: 0, sort: 'relevance'}).sort, ['_score', {citation_count: 'desc'}])
})

test('no aggregations are ever built for works', () => {
    // 50M documents on 4 shards: a facet here is a full scan. The filter
    // vocabularies are static constants in @heritagemonitor/shared instead.
    const body = worksBody({q: 'heritage', size: 20, from: 0})
    assert.equal('aggs' in body, false)
})

test('the fuzzy rerun carries the works typo budget', () => {
    const body = worksBody({q: 'heritge', size: 20, from: 0, mode: 'fuzzy', suggest: true, timeout: '1500ms'})
    assert.equal(body.timeout, '1500ms')
    assert.ok(body.suggest)
})

test('the works count body is the same matching with nothing attached', () => {
    // It is a `_count`: no hits, no sort, no aggregations — only the query.
    const body = worksCountBody({q: 'heritage', filters: {org: ['o1'], corpus: 'dch'}})
    assert.deepEqual(Object.keys(body), ['query'])
    assert.deepEqual((body.query as {bool: {filter: unknown[]}}).bool.filter, [
        {term: {is_ch_via_project: true}},
        {terms: {organisation_ids: ['o1']}},
    ])
})

test('an organisation works tab with no text filters on the organisation alone', () => {
    assert.deepEqual(workFilters({org: ['o1']}), [{terms: {organisation_ids: ['o1']}}])
})
