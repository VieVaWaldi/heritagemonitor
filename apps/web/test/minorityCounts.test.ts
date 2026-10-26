import assert from 'node:assert/strict'
import {test} from 'node:test'
import {formatRowProjectCount, isTabNarrowed, ofTotalSuffix} from '../src/modules/search/minorities/minorityFormat.ts'

const jewish = {project_count: 1344, dch_project_count: 295} as never

test('the row shows the plain project count in the science corpus and the DCH count in DCH', () => {
    assert.equal(formatRowProjectCount(jewish, 'science'), '1,344 projects')
    assert.equal(formatRowProjectCount(jewish, undefined), '1,344 projects')
    assert.equal(formatRowProjectCount(jewish, 'dch'), '295 DCH projects')
    assert.equal(formatRowProjectCount({project_count: 5, dch_project_count: 1} as never, 'dch'), '1 DCH project')
})

test('search text or the DCH corpus narrows the projects tab; nothing else the page holds does for works', () => {
    assert.equal(isTabNarrowed('minorities:projects', new URLSearchParams('c=science')), false)
    assert.equal(isTabNarrowed('minorities:projects', new URLSearchParams('q=jewish')), true)
    assert.equal(isTabNarrowed('minorities:projects', new URLSearchParams('c=dch')), true)
    assert.equal(isTabNarrowed('minorities:projects', new URLSearchParams('funder=EC')), true)
    // works and organisations do not forward q, so text alone does not narrow them
    assert.equal(isTabNarrowed('minorities:works', new URLSearchParams('q=jewish')), false)
    assert.equal(isTabNarrowed('minorities:works', new URLSearchParams('c=dch')), true)
    assert.equal(isTabNarrowed('minorities:organisations', new URLSearchParams('q=x&funder=EC')), false)
})

test('"of N in total" appears only when narrowed, with a total that differs', () => {
    assert.equal(ofTotalSuffix(105, 1344, true), ' (of 1,344 in total)')
    assert.equal(ofTotalSuffix(1344, 1344, true), '')
    assert.equal(ofTotalSuffix(105, 1344, false), '')
    assert.equal(ofTotalSuffix(105, null, true), '')
})
