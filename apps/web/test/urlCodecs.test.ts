import assert from 'node:assert/strict'
import {test} from 'node:test'
// Imported straight from source: the codecs are deliberately free of React,
// next/navigation and `@/` path aliases, so Node's own TypeScript support can
// run them as-is. The hooks around them are the part that needs a browser.
import {
    applyPatch,
    buildSearchUrl,
    patchInvalidatesPage,
    readId,
    readList,
    readOneOf,
    readOptionalOneOf,
    readPage,
    readText,
    toApiSearchParams,
} from '../src/common/url/codecs.ts'

const params = (search: string) => new URLSearchParams(search)

test('readText trims and defaults to empty', () => {
    assert.equal(readText(params('q=%20heritage%20'), 'q'), 'heritage')
    assert.equal(readText(params(''), 'q'), '')
})

test('readOneOf falls back instead of breaking on a hand-edited link', () => {
    assert.equal(readOneOf(params('c=dch'), 'c', ['science', 'dch'] as const, 'science'), 'dch')
    assert.equal(readOneOf(params('c=nonsense'), 'c', ['science', 'dch'] as const, 'science'), 'science')
    assert.equal(readOneOf(params(''), 'c', ['science', 'dch'] as const, 'science'), 'science')
})

test('readOptionalOneOf keeps "nothing chosen" as a state of its own', () => {
    assert.equal(readOptionalOneOf(params('sort=budget'), 'sort', ['relevance', 'budget'] as const), 'budget')
    assert.equal(readOptionalOneOf(params('sort=alphabetical'), 'sort', ['relevance', 'budget'] as const), null)
    assert.equal(readOptionalOneOf(params(''), 'sort', ['relevance', 'budget'] as const), null)
})

test('readPage clamps to the deepest reachable page', () => {
    assert.equal(readPage(params('page=7'), 500), 7)
    assert.equal(readPage(params('page=501'), 500), 500)
    assert.equal(readPage(params('page=0'), 500), 1)
    assert.equal(readPage(params('page=-3'), 500), 1)
    assert.equal(readPage(params('page=abc'), 500), 1)
    assert.equal(readPage(params('page=2.5'), 500), 1)
    assert.equal(readPage(params(''), 500), 1)
})

test('readList de-duplicates, drops blanks and caps at 50 values', () => {
    assert.deepEqual(readList(params('funder=EC&funder=NIH&funder=EC'), 'funder'), ['EC', 'NIH'])
    assert.deepEqual(readList(params('funder=&funder=EC'), 'funder'), ['EC'])
    const many = new URLSearchParams(Array.from({length: 60}, (_, i) => ['topic', String(i)]))
    assert.equal(readList(many, 'topic').length, 50)
    assert.deepEqual(readList(params('topic=a&topic=b&topic=c'), 'topic', 2), ['a', 'b'])
})

test('readId keeps a 20-digit id exactly (never parsed as a number)', () => {
    const id = '13508218431153968733'
    assert.equal(readId(params(`sel=${id}`), 'sel'), id)
    assert.notEqual(String(Number(id)), id, 'precondition: this id does not survive Number()')
    assert.equal(readId(params(''), 'sel'), null)
})

test('applyPatch keeps params it does not mention, including unknown ones', () => {
    const next = applyPatch(params('q=heritage&future=keep-me'), {page: 3})
    assert.equal(next.get('q'), 'heritage')
    assert.equal(next.get('future'), 'keep-me')
    assert.equal(next.get('page'), '3')
})

test('applyPatch: null removes, undefined leaves alone, empty string removes', () => {
    assert.equal(applyPatch(params('sel=1'), {sel: null}).has('sel'), false)
    assert.equal(applyPatch(params('sel=1'), {sel: undefined}).get('sel'), '1')
    assert.equal(applyPatch(params('q=x'), {q: ''}).has('q'), false)
})

test('applyPatch replaces a repeated param wholesale rather than appending', () => {
    const next = applyPatch(params('funder=EC&funder=NIH'), {funder: ['UKRI']})
    assert.deepEqual(next.getAll('funder'), ['UKRI'])
    assert.equal(applyPatch(params('funder=EC'), {funder: []}).has('funder'), false)
})

test('round-trip: every value written is read back identically', () => {
    const written = applyPatch(new URLSearchParams(), {
        q: '"digital heritage" -museum',
        c: 'dch',
        page: 4,
        sort: 'budget',
        sel: '13508218431153968733',
        funder: ['EC', 'NIH'],
    })
    const reparsed = new URLSearchParams(written.toString())
    assert.equal(readText(reparsed, 'q'), '"digital heritage" -museum')
    assert.equal(readOneOf(reparsed, 'c', ['science', 'dch'] as const, 'science'), 'dch')
    assert.equal(readPage(reparsed, 500), 4)
    assert.equal(readOptionalOneOf(reparsed, 'sort', ['relevance', 'budget'] as const), 'budget')
    assert.equal(readId(reparsed, 'sel'), '13508218431153968733')
    assert.deepEqual(readList(reparsed, 'funder'), ['EC', 'NIH'])
})

test('changing what matches resets the page; changing what is on screen does not', () => {
    assert.equal(patchInvalidatesPage({q: 'heritage'}), true)
    assert.equal(patchInvalidatesPage({c: 'dch'}), true)
    assert.equal(patchInvalidatesPage({sort: 'budget'}), true)
    assert.equal(patchInvalidatesPage({funder: ['EC']}), true)
    assert.equal(patchInvalidatesPage({page: 3}), false)
    assert.equal(patchInvalidatesPage({sel: '123'}), false)
    assert.equal(patchInvalidatesPage({tab: 'organisations'}), false)
    assert.equal(patchInvalidatesPage({sel: undefined}), false)
})

test('the api gets the search state and none of the view state', () => {
    const api = toApiSearchParams(params('q=heritage&c=dch&page=3&sort=budget&e=projects&sel=42&tab=overview&only=7'))
    assert.equal(api, 'c=dch&only=7&page=3&q=heritage&sort=budget')
})

test('page=1 is not sent (it is the default on both sides)', () => {
    assert.equal(toApiSearchParams(params('q=heritage&page=1')), 'q=heritage')
})

test('the api param string is stable regardless of param order', () => {
    assert.equal(toApiSearchParams(params('c=dch&q=heritage')), toApiSearchParams(params('q=heritage&c=dch')))
})

test('buildSearchUrl writes only what it was given', () => {
    assert.equal(buildSearchUrl({route: '/search'}), '/search')
    assert.equal(buildSearchUrl({route: '/search', query: 'heritage', entity: 'projects', corpus: 'dch'}), '/search?q=heritage&e=projects&c=dch')
    assert.equal(
        buildSearchUrl({route: '/search', entity: 'organisations', only: '99', selection: '99'}),
        '/search?e=organisations&only=99&sel=99',
    )
})
