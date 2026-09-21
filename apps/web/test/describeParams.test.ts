import assert from 'node:assert/strict'
import {test} from 'node:test'
// Imported straight from source: these are plain functions over
// URLSearchParams, no React and no `@/` aliases.
import {SEARCH_PARAM, URL_PARAM_LABELS, describeUrlParams} from '../src/common/url/codecs.ts'

test('EVERY url param has a human label', () => {
    // The point of this test: a filter added to SEARCH_PARAM without a label
    // would silently never reach Lucy's context. Failing here is the reminder.
    const missing = Object.values(SEARCH_PARAM).filter((param) => !URL_PARAM_LABELS[param])
    assert.deepEqual(missing, [], `these URL params have no label in URL_PARAM_LABELS: ${missing.join(', ')}`)
})

test('labels are unique, so two parameters cannot read as the same thing', () => {
    const labels = Object.values(URL_PARAM_LABELS)
    assert.equal(new Set(labels).size, labels.length)
})

test('describes exactly the params present, repeated values included', () => {
    const described = describeUrlParams(new URLSearchParams('q=heritage&funder=EC&funder=UKRI&page=3'))
    assert.deepEqual(described, [
        {param: 'funder', label: 'Funder', values: ['EC', 'UKRI']},
        {param: 'page', label: 'Page', values: ['3']},
        {param: 'q', label: 'Search text', values: ['heritage']},
    ])
})

test('the whole page state is reported, not just the filters', () => {
    const described = describeUrlParams(
        new URLSearchParams('q=heritage&c=dch&sort=budget&page=2&sel=42&only=42&tab=organisations&dpage=2&years=2019-2025'),
    )
    const byParam = Object.fromEntries(described.map((entry) => [entry.param, entry.label]))
    assert.deepEqual(byParam, {
        q: 'Search text',
        c: 'Corpus',
        sort: 'Sort',
        page: 'Page',
        sel: 'Selected id',
        only: 'Restricted to id',
        tab: 'Open tab',
        dpage: 'Page within the open tab',
        years: 'Years',
    })
})

test('values can be relabelled, e.g. a topic id into its name', () => {
    const described = describeUrlParams(new URLSearchParams('topic=13718'), {
        labelValue: (param, value) => (param === 'topic' && value === '13718' ? 'Media Influence and Politics' : value),
    })
    assert.deepEqual(described, [{param: 'topic', label: 'Topic', values: ['Media Influence and Politics']}])
})

test('an unknown param is reported under its own name rather than dropped', () => {
    assert.deepEqual(describeUrlParams(new URLSearchParams('somethingElse=40')), [
        {param: 'somethingElse', label: 'somethingElse', values: ['40']},
    ])
})

test('empty values are not reported as set', () => {
    assert.deepEqual(describeUrlParams(new URLSearchParams('q=&funder=')), [])
})
