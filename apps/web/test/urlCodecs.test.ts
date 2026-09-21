import assert from 'node:assert/strict'
import {test} from 'node:test'
// Imported straight from source: the codecs are deliberately free of React,
// next/navigation and `@/` path aliases, so Node's own TypeScript support can
// run them as-is. The hooks around them are the part that needs a browser.
import {
    applyPatch,
    buildResetPatch,
    buildSearchUrl,
    patchClearsDetailPage,
    patchClearsSelection,
    patchInvalidatesPage,
    readId,
    readList,
    readOneOf,
    readOptionalOneOf,
    readPage,
    readText,
    readTopicSelection,
    readYears,
    toApiSearchParams,
    topicSelectionPatch,
    topicSelectionSize,
    yearsPatchValue,
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

// --- Step 2: years, topics, and the coupled resets --------------------------

test('readYears parses a range and clamps it to the allowed window', () => {
    const today = new Date('2026-06-01T00:00:00Z')
    assert.deepEqual(readYears(params('years=2019-2025'), today), {from: 2019, to: 2025})
    // 1980 at the bottom, current year + 3 at the top.
    assert.deepEqual(readYears(params('years=1900-2099'), today), {from: 1980, to: 2029})
    assert.deepEqual(readYears(params('years=2025-2019'), today), null, 'reversed range is dropped')
    assert.deepEqual(readYears(params('years=2019'), today), null)
    assert.deepEqual(readYears(params('years=abcd-efgh'), today), null)
    assert.deepEqual(readYears(params(''), today), null)
})

test('a year range round-trips through the URL', () => {
    const today = new Date('2026-06-01T00:00:00Z')
    const written = applyPatch(new URLSearchParams(), {years: yearsPatchValue({from: 2019, to: 2025})})
    assert.equal(written.get('years'), '2019-2025')
    assert.deepEqual(readYears(new URLSearchParams(written.toString()), today), {from: 2019, to: 2025})
    assert.equal(applyPatch(params('years=2019-2025'), {years: yearsPatchValue(null)}).has('years'), false)
})

test('the three topic levels share one cap of 20, most specific first', () => {
    const many = new URLSearchParams([
        ...Array.from({length: 15}, (_, i): [string, string] => ['topic', `t${i}`]),
        ...Array.from({length: 10}, (_, i): [string, string] => ['subfield', `s${i}`]),
        ...Array.from({length: 10}, (_, i): [string, string] => ['field', `f${i}`]),
    ])
    const selection = readTopicSelection(many)
    assert.equal(topicSelectionSize(selection), 20)
    assert.equal(selection.topic.length, 15, 'topics are kept first')
    assert.equal(selection.subfield.length, 5, 'subfields fill the remaining budget')
    assert.equal(selection.field.length, 0, 'fields are dropped once the cap is reached')
})

test('a topic selection under the cap is read back unchanged', () => {
    const selection = {topic: ['10001', '10002'], subfield: ['1908'], field: []}
    const written = applyPatch(new URLSearchParams(), topicSelectionPatch(selection))
    assert.deepEqual(readTopicSelection(new URLSearchParams(written.toString())), selection)
})

test('changing the page or the result set clears the open row', () => {
    assert.equal(patchClearsSelection({page: 3}), true)
    assert.equal(patchClearsSelection({page: null}), true)
    assert.equal(patchClearsSelection({q: 'heritage'}), true)
    assert.equal(patchClearsSelection({funder: ['EC']}), true)
    assert.equal(patchClearsSelection({c: 'dch'}), true)
    assert.equal(patchClearsSelection({sort: 'budget'}), true)
    assert.equal(patchClearsSelection({years: '2019-2025'}), true)
})

test('a patch that picks a row itself keeps it — deep links must survive', () => {
    // Step 3's deep link: one patch that restricts the list AND opens a row.
    assert.equal(patchClearsSelection({only: ['42'], sel: '42'}), false)
    // A plain row click changes nothing else, so there is nothing to clear.
    assert.equal(patchClearsSelection({sel: '42'}), false)
    // Selecting a row on another page in one patch keeps that row.
    assert.equal(patchClearsSelection({page: 2, sel: '42'}), false)
    // Tab switches leave the selection alone.
    assert.equal(patchClearsSelection({tab: 'organisations'}), false)
})

test('the detail panel page is dropped whenever its list changes', () => {
    assert.equal(patchClearsDetailPage({sel: '42'}), true, 'another row, another organisations list')
    assert.equal(patchClearsDetailPage({tab: 'organisations'}), true)
    assert.equal(patchClearsDetailPage({q: 'heritage'}), true)
    assert.equal(patchClearsDetailPage({dpage: 2}), false, 'paging that list is what it is for')
})

test('the detail panel page never reaches the api', () => {
    assert.equal(toApiSearchParams(params('q=heritage&dpage=3&tab=organisations')), 'q=heritage')
})

test('filters are forwarded to the api verbatim, repeated params included', () => {
    assert.equal(
        toApiSearchParams(params('q=heritage&funder=EC&funder=NIH&years=2019-2025&topic=10001&e=projects')),
        'funder=EC&funder=NIH&q=heritage&topic=10001&years=2019-2025',
    )
})

// --- reset -------------------------------------------------------------------

test('reset clears the search text and every filter, and keeps the lens', () => {
    // The entity and the corpus are what you are looking THROUGH; everything
    // else is what you narrowed with, and "reset" undoes all of it — a reset
    // that leaves `q` behind resets nothing the user can see.
    const patch = buildResetPatch(
        params('q=heritage&e=projects&c=dch&page=3&sort=budget&sel=42&funder=EC&years=2019-2025&topic=13718&tab=works&dpage=2'),
        ['e', 'c'],
    )
    assert.deepEqual(patch, {
        q: null,
        page: null,
        sort: null,
        sel: null,
        funder: null,
        years: null,
        topic: null,
        tab: null,
        dpage: null,
    })
    assert.equal('e' in patch, false)
    assert.equal('c' in patch, false)
})

test('reset clears a param added later without anyone updating this code', () => {
    // Built from the params actually present, not from a hand-written list.
    assert.deepEqual(buildResetPatch(params('somethingNew=x&c=dch'), ['c']), {somethingNew: null})
})

test('reset of an already-clean url is an empty patch', () => {
    assert.deepEqual(buildResetPatch(params('e=projects&c=dch'), ['e', 'c']), {})
})

test('applying the reset patch leaves exactly the kept params', () => {
    const before = params('q=heritage&e=works&c=dch&oa=gold&page=4')
    const after = applyPatch(before, buildResetPatch(before, ['e', 'c']))
    assert.equal(after.toString(), 'e=works&c=dch')
})

test('the publications toggle is a tab-level param that never touches the page query', () => {
    // "Show all publications" must not rewrite `q`: the page's search still
    // ranks the experts, only the tab widens.
    const patch = {allWorks: '1'}
    assert.equal(patchClearsSelection(patch), false, 'it does not invalidate the open row')
    assert.equal(patchInvalidatesPage(patch), false, 'nor the page of results')
    const after = applyPatch(params('q=heritage&sel=42&tab=works'), patch)
    assert.equal(after.get('q'), 'heritage')
    assert.equal(after.get('allWorks'), '1')
    // …and it never reaches the api's search request.
    assert.equal(toApiSearchParams(after), 'q=heritage')
})
