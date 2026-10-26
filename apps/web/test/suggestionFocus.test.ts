import assert from 'node:assert/strict'
import {test} from 'node:test'
import {applyPatch, buildEntityLink, buildFocusPatch, SEARCH_PARAM} from '../src/common/url/codecs.ts'

test('picking a suggestion on an open page leaves only that document, selected, text cleared', () => {
    const before = new URLSearchParams('e=minorities&c=science&q=sami&funder=EC&page=3&sort=x&sel=Q1&tab=works')
    const after = applyPatch(before, buildFocusPatch(before, 'Q48199'))
    assert.deepEqual(Object.fromEntries(after), {e: 'minorities', c: 'science', only: 'Q48199', sel: 'Q48199'})
})

test('the in-place patch and the landing-page link agree on the result', () => {
    const inPlace = applyPatch(new URLSearchParams('e=projects&c=dch&q=x'), buildFocusPatch(new URLSearchParams('e=projects&c=dch&q=x'), '42'))
    const link = new URL(buildEntityLink({entity: 'projects', id: '42', corpus: 'dch'}), 'http://x')
    assert.deepEqual(Object.fromEntries(inPlace), Object.fromEntries(link.searchParams))
})

test('the landing-page link for a suggestion has only+sel+entity+corpus and no q', () => {
    const url = new URL(buildEntityLink({entity: 'minorities', id: 'Q48199', corpus: 'science', route: '/search/minorities'}), 'http://x')
    assert.equal(url.pathname, '/search/minorities')
    assert.equal(url.searchParams.get(SEARCH_PARAM.only), 'Q48199')
    assert.equal(url.searchParams.get(SEARCH_PARAM.selection), 'Q48199')
    assert.equal(url.searchParams.get(SEARCH_PARAM.entity), 'minorities')
    assert.equal(url.searchParams.has(SEARCH_PARAM.query), false)
})
