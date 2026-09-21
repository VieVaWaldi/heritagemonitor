import assert from 'node:assert/strict'
import {test} from 'node:test'
// Tests run against the compiled `dist/` (the `test` script builds first).
import {organisationAutocompleteBody, organisationFilters, organisationsBody} from '../dist/query/organisations.js'

test('the DCH corpus filters organisations on has_dch_project', () => {
    assert.deepEqual(organisationFilters({corpus: 'dch'}), [{term: {has_dch_project: true}}])
    assert.deepEqual(organisationFilters({corpus: 'science'}), [])
})

test('filter names map to the index field names', () => {
    // The URL says `ror`/`country`, this builder says `rorType`/`country`, and
    // the index says `rorTypes`/`countryCode`; the service is the one place
    // the first two meet, this test pins the last step.
    assert.deepEqual(organisationFilters({rorType: ['unknown'], country: ['DE'], region: ['Unknown']}), [
        {terms: {region: ['Unknown']}},
        {terms: {rorTypes: ['unknown']}},
        {terms: {countryCode: ['DE']}},
    ])
})

test('hasGeo and only are structural filters, not value lists', () => {
    assert.deepEqual(organisationFilters({hasGeo: true}), [{exists: {field: 'geo'}}])
    assert.deepEqual(organisationFilters({only: ['42']}), [{ids: {values: ['42']}}])
})

test('a blank query is ranked by funding — BM25 has nothing to rank on', () => {
    const body = organisationsBody({q: '', size: 20, from: 0})
    assert.deepEqual(body.sort, [{total_funding_eur: 'desc'}, {project_count: 'desc'}, {work_count: 'desc'}])
    assert.equal((body.query as {bool: {should?: unknown}}).bool.should, undefined)
})

test('a text query with no explicit sort blends BM25 with the project-count rank feature (D33)', () => {
    const body = organisationsBody({q: 'fraunhofer', size: 20, from: 0})
    assert.equal(body.sort, undefined, 'score order, not a field sort')
    // 2.0, not the 0.5 carried over from export/queries.py: measured on the
    // dev index as the smallest boost that puts Fraunhofer Society first for
    // `fraunhofer` while precise small-name matches still win their own
    // queries. See NAME_MATCH_ACTIVITY_BOOST for the measurements.
    assert.deepEqual((body.query as {bool: {should: unknown}}).bool.should, [
        {rank_feature: {field: 'rank_projects', log: {scaling_factor: 1.0}, boost: 2.0}},
    ])
})

test('an explicit sort wins over both, with stable tie-breaks', () => {
    assert.deepEqual(organisationsBody({q: 'fraunhofer', size: 20, from: 0, sort: 'projects'}).sort, [
        {project_count: 'desc'},
        {project_count: 'desc'},
        {work_count: 'desc'},
    ])
    assert.deepEqual(organisationsBody({q: '', size: 20, from: 0, sort: 'works'}).sort, [
        {work_count: 'desc'},
        {project_count: 'desc'},
        {work_count: 'desc'},
    ])
})

test('sort=relevance with a query is the blended ranking, not a field sort', () => {
    const body = organisationsBody({q: 'fraunhofer', size: 20, from: 0, sort: 'relevance'})
    assert.equal(body.sort, undefined)
    assert.ok((body.query as {bool: {should?: unknown}}).bool.should)
})

test('autocomplete searches all three name fields and prefers active organisations', () => {
    const body = organisationAutocompleteBody('fraunh', 5) as {
        size: number
        query: {bool: {must: {multi_match: {fields: string[]}}; should: unknown[]}}
    }
    assert.equal(body.size, 5)
    assert.ok(body.query.bool.must.multi_match.fields.includes('legalName.sayt'))
    assert.ok(body.query.bool.must.multi_match.fields.includes('alternativeNames.sayt'))
    assert.deepEqual(body.query.bool.should, [{rank_feature: {field: 'rank_projects', log: {scaling_factor: 1.0}}}])
})
