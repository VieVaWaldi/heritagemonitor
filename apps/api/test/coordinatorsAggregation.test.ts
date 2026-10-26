import assert from 'node:assert/strict'
import {test} from 'node:test'
import {expertAggs} from '../dist/modules/experts/opensearch.repository.js'
import {fundedOrganisationAggs} from '../dist/modules/funding/opensearch.repository.js'

// "Coordinators only" is one switch: which project field the organisation
// buckets come from. Everything else in the aggregation must be identical.

const termsField = (aggs: Record<string, unknown>) => (aggs.orgs as {terms: {field: string}}).terms.field

test('experts aggregate on org_ids by default and coordinator_ids when asked', () => {
    assert.equal(termsField(expertAggs(false)), 'org_ids')
    assert.equal(termsField(expertAggs(true)), 'coordinator_ids')
    const cardinality = (aggs: Record<string, unknown>) => (aggs.organisationCount as {cardinality: {field: string}}).cardinality.field
    assert.equal(cardinality(expertAggs(false)), 'org_ids')
    assert.equal(cardinality(expertAggs(true)), 'coordinator_ids')
})

test('funding aggregates on org_ids by default and coordinator_ids when asked, keeping the funding sum', () => {
    assert.equal(termsField(fundedOrganisationAggs(false)), 'org_ids')
    assert.equal(termsField(fundedOrganisationAggs(true)), 'coordinator_ids')
    const sum = (aggs: Record<string, unknown>) => (aggs.orgs as {aggs: {funding: unknown}}).aggs.funding
    assert.deepEqual(sum(fundedOrganisationAggs(true)), sum(fundedOrganisationAggs(false)))
    assert.ok('funder' in fundedOrganisationAggs(true) && 'programme' in fundedOrganisationAggs(true))
})

test('the facet aggregations of the experts page are untouched by the switch', () => {
    const keys = (aggs: Record<string, unknown>) => Object.keys(aggs).sort()
    assert.deepEqual(keys(expertAggs(true)), keys(expertAggs(false)))
})
