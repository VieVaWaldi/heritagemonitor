import assert from 'node:assert/strict'
import {test} from 'node:test'
import {buildResetPatch, canReset, SEARCH_PARAM} from '../src/common/url/codecs.ts'

test('reset is enabled when only the search text has a value', () => {
    assert.equal(canReset(false, new URLSearchParams('q=castle')), true)
})

test('reset is enabled by an active filter alone, and disabled when nothing is set', () => {
    assert.equal(canReset(true, new URLSearchParams('')), true)
    assert.equal(canReset(false, new URLSearchParams('')), false)
})

test('blank search text and lens-only params do not enable reset', () => {
    assert.equal(canReset(false, new URLSearchParams('q=%20%20')), false)
    assert.equal(canReset(false, new URLSearchParams('e=projects&c=dch')), false)
})

test('the reset patch clears the query and keeps the lens', () => {
    const params = new URLSearchParams('e=projects&c=dch&q=castle')
    const patch = buildResetPatch(params, [SEARCH_PARAM.entity, SEARCH_PARAM.corpus])
    assert.equal(patch[SEARCH_PARAM.query], null)
    assert.equal(SEARCH_PARAM.entity in patch, false)
})

test('the coordinators param is described for Lucy and cleared by reset', async () => {
    const {URL_PARAM_LABELS} = await import('../src/common/url/codecs.ts')
    assert.ok(URL_PARAM_LABELS[SEARCH_PARAM.coordinators].length > 0)
    const patch = buildResetPatch(new URLSearchParams('e=experts&c=dch&coordinators=true'), [SEARCH_PARAM.entity, SEARCH_PARAM.corpus])
    assert.equal(patch[SEARCH_PARAM.coordinators], null)
})
