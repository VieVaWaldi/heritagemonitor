import assert from 'node:assert/strict'
import {test} from 'node:test'
import {searchNavLabels} from '../src/modules/search/components/searchNavModel.ts'

const entities = [
    {key: 'projects', label: 'Projects'},
    {key: 'organisations', label: 'Organisations'},
    {key: 'works', label: 'Works'},
]

test('/search: the use case name and the selected entity name', () => {
    assert.deepEqual(searchNavLabels({name: 'Search', hasEntitySelector: true}, 'organisations', entities), {useCaseName: 'Search', entityName: 'Organisations'})
    assert.equal(searchNavLabels({name: 'Search', hasEntitySelector: true}, 'projects', entities).entityName, 'Projects')
})

test('every other route shows the use case name only: the entity there is fixed by the route', () => {
    assert.deepEqual(searchNavLabels({name: 'Find Experts'}, 'organisations', entities), {useCaseName: 'Find Experts', entityName: null})
    assert.deepEqual(searchNavLabels({name: 'Track Funding', hasEntitySelector: false}, 'grants', entities), {useCaseName: 'Track Funding', entityName: null})
})

test('the collaboration pages show their sub-use-case name, the other routes the use case name', () => {
    const collaboration = {name: 'Visualise Collaborations'}
    assert.equal(searchNavLabels(collaboration, 'organisations', entities, {name: 'Network of your organisations'}).useCaseName, 'Network of your organisations')
    assert.equal(searchNavLabels(collaboration, 'projects', entities, {name: 'Network of a query'}).useCaseName, 'Network of a query')
    // no sub-use-case (or an undefined one): the use case's own name
    assert.equal(searchNavLabels({name: 'Find Experts'}, 'organisations', entities, undefined).useCaseName, 'Find Experts')
    assert.equal(searchNavLabels({name: 'Find Experts'}, 'organisations', entities, null).useCaseName, 'Find Experts')
    // a sub-use-case does not change whether the entity is named
    assert.equal(searchNavLabels(collaboration, 'projects', entities, {name: 'Network of a query'}).entityName, null)
})

test('an entity that is not among the options yields no name rather than a wrong one', () => {
    assert.equal(searchNavLabels({name: 'Search', hasEntitySelector: true}, 'grants', entities).entityName, null)
})
