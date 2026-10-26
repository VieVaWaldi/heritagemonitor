import assert from 'node:assert/strict'
import {test} from 'node:test'
// Tests run against the compiled `dist/` (the `test` script builds first).
import {minorityDtoSchema} from '../dist/minorities.js'

// The document shape the index actually returns: it stores no nulls and no
// empty arrays, so a field with no value is simply ABSENT from `_source`.
const SETOS = {
    qid: 'Q10113811',
    group_name_en: 'Setos',
    countries: ['Estonia'],
    source_class: ['ethnic group'],
    religions: ['Eastern Orthodoxy'],
    native_languages: ['Estonian', 'Russian', 'Seto'],
    search_keywords: ['Setos'],
    subclass_of: [],
    admin_territory: [],
    ancestral_home: [],
    known_subgroups: [],
    has_subgroups: false,
    is_seed: false,
    population: 10197,
    project_count: 0,
    dch_project_count: 0,
    org_count: 0,
    work_count: 0,
    topic_ids: [],
    topic_counts: [],
    merged_qids: ['Q10113811'],
}

test('REGRESSION: a group with no population still parses', () => {
    // This is the bug that made the page show 4 of 20 rows: `population` was
    // declared `.nullable()`, which requires the KEY to exist, and the index
    // omits it for every group whose population is unknown — so most groups
    // failed validation and were dropped on the floor by the service.
    const {population: _population, ...withoutPopulation} = SETOS
    const result = minorityDtoSchema.safeParse(withoutPopulation)
    assert.equal(result.success, true, result.success ? '' : JSON.stringify(result.error.issues))
    assert.equal(result.data?.population, null)
})

test('every optional field may be absent, not just population', () => {
    // The same trap for every other field the index omits when empty.
    const minimal = {qid: 'Q1', group_name_en: 'Example'}
    const result = minorityDtoSchema.safeParse(minimal)
    assert.equal(result.success, true, result.success ? '' : JSON.stringify(result.error.issues))
    assert.deepEqual(result.data?.countries, [])
    assert.deepEqual(result.data?.topic_counts, [])
    assert.deepEqual(result.data?.merged_qids, [])
    assert.equal(result.data?.is_seed, false)
    assert.equal(result.data?.project_count, null)
})

test('the full document parses with its new counts', () => {
    const result = minorityDtoSchema.safeParse(SETOS)
    assert.equal(result.success, true, result.success ? '' : JSON.stringify(result.error.issues))
    assert.equal(result.data?.population, 10197)
    assert.deepEqual(result.data?.merged_qids, ['Q10113811'])
})

test('a document with no identity at all is still rejected', () => {
    // Being permissive about empty fields must not mean accepting anything:
    // a row without a qid or a name cannot be rendered or linked.
    assert.equal(minorityDtoSchema.safeParse({group_name_en: 'No qid'}).success, false)
    assert.equal(minorityDtoSchema.safeParse({qid: 'Q1'}).success, false)
})

test('topic_counts keep their shape', () => {
    const result = minorityDtoSchema.safeParse({...SETOS, topic_counts: [{topic_id: '13718', n: 42}]})
    assert.deepEqual(result.data?.topic_counts, [{topic_id: '13718', n: 42}])
})
