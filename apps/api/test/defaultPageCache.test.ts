import assert from 'node:assert/strict'
import {test} from 'node:test'
// Tests run against the compiled `dist/` (the `test` script builds first):
// this app ships ESM with explicit `.js` specifiers, which Node's own
// TypeScript support does not rewrite back to `.ts`.
import {
    DEFAULT_PAGE_TTL_MS,
    MAX_CACHED_DEFAULT_PAGE,
    defaultPageKey,
    isDefaultRequest,
    readDefaultPage,
    writeDefaultPage,
} from '../dist/common/search/defaultPageCache.js'

test('the key separates entity, corpus, sort and page', () => {
    assert.equal(defaultPageKey({entity: 'works', corpus: 'dch', page: 2, sort: 'citations'}), 'default:works:dch:citations:2')
    // Unset values are spelled out, so `?c=` and `?c=dch` cannot collide.
    assert.equal(defaultPageKey({entity: 'projects', corpus: undefined, page: 1, sort: undefined}), 'default:projects:all:default:1')
    assert.notEqual(
        defaultPageKey({entity: 'projects', corpus: 'science', page: 1, sort: undefined}),
        defaultPageKey({entity: 'projects', corpus: 'dch', page: 1, sort: undefined}),
    )
})

test('only a request with nothing but corpus/page/sort is the default one', () => {
    assert.equal(isDefaultRequest({c: 'dch', page: 3, sort: 'citations'}, 3), true)
    assert.equal(isDefaultRequest({}, 1), true)
    // Empty values are the same as absent — the web omits them, the api must agree.
    assert.equal(isDefaultRequest({q: '', oa: [], publisher: undefined}, 1), true)
})

test('anything the user actually asked for makes it their own search, not the default', () => {
    assert.equal(isDefaultRequest({q: 'heritage'}, 1), false)
    assert.equal(isDefaultRequest({oa: ['gold']}, 1), false)
    assert.equal(isDefaultRequest({years: '2019-2025'}, 1), false)
    assert.equal(isDefaultRequest({only: ['42']}, 1), false)
    // A filter added later is not cached by accident: unknown keys count.
    assert.equal(isDefaultRequest({somethingNew: ['x']}, 1), false)
})

test('only the pages people walk through are cached', () => {
    assert.equal(isDefaultRequest({}, MAX_CACHED_DEFAULT_PAGE), true)
    assert.equal(isDefaultRequest({}, MAX_CACHED_DEFAULT_PAGE + 1), false)
    assert.equal(isDefaultRequest({}, 0), false)
})

test('a written page is read back, and an unknown key is a miss', () => {
    const key = defaultPageKey({entity: 'works', corpus: 'science', page: 1, sort: undefined})
    assert.equal(readDefaultPage(key), undefined)
    writeDefaultPage(key, {hits: ['a']})
    assert.deepEqual(readDefaultPage(key), {hits: ['a']})
    assert.equal(readDefaultPage('default:works:dch:default:1'), undefined)
})

test('an entry past its TTL is a miss, not stale data', {skip: false}, () => {
    const key = defaultPageKey({entity: 'projects', corpus: undefined, page: 4, sort: undefined})
    writeDefaultPage(key, {hits: ['old']})

    const realNow = Date.now
    try {
        Date.now = () => realNow() + DEFAULT_PAGE_TTL_MS + 1
        assert.equal(readDefaultPage(key), undefined)
    } finally {
        Date.now = realNow
    }
})
