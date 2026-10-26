import assert from 'node:assert/strict'
import {test} from 'node:test'
// Imported straight from source: a pure reducer, no React.
import {
    initialQueryDraftState,
    queryDraftReducer,
    shouldEmit,
    type QueryDraftEvent,
    type QueryDraftState,
} from '../src/common/url/queryDraft.ts'

const run = (state: QueryDraftState, events: QueryDraftEvent[]) => events.reduce(queryDraftReducer, state)

test('typing updates the draft and nothing else', () => {
    const state = run(initialQueryDraftState(''), [{type: 'type', value: 'a'}, {type: 'type', value: 'ab'}])
    assert.equal(state.draft, 'ab')
    assert.deepEqual(state.pending, [])
    assert.equal(shouldEmit(state), true)
})

test('an echo of our own write leaves the draft alone', () => {
    let state = run(initialQueryDraftState(''), [{type: 'type', value: 'ab'}, {type: 'emit', value: 'ab', at: 0}])
    state = queryDraftReducer(state, {type: 'url', value: 'ab', at: 10})
    assert.equal(state.draft, 'ab')
    assert.deepEqual(state.pending, [])
    assert.equal(shouldEmit(state), false)
})

test('RACE: a late echo of an older value must not eat the newest character', () => {
    let state = run(initialQueryDraftState(''), [
        {type: 'type', value: 'ab'},
        {type: 'emit', value: 'ab', at: 0},
        {type: 'type', value: 'abc'},
        {type: 'emit', value: 'abc', at: 10},
    ])
    state = queryDraftReducer(state, {type: 'url', value: 'ab', at: 20})
    assert.equal(state.draft, 'abc', 'the newest character survives the stale echo')
    state = queryDraftReducer(state, {type: 'url', value: 'abc', at: 30})
    assert.equal(state.draft, 'abc')
    assert.deepEqual(state.pending, [])
})

test('RACE: out-of-order echoes — the newest arrives first, the stale one is ignored', () => {
    let state = run(initialQueryDraftState(''), [
        {type: 'type', value: 'a'},
        {type: 'emit', value: 'a', at: 0},
        {type: 'type', value: 'ab'},
        {type: 'emit', value: 'ab', at: 5},
        {type: 'type', value: 'abc'},
        {type: 'emit', value: 'abc', at: 10},
    ])
    state = queryDraftReducer(state, {type: 'url', value: 'abc', at: 15})
    assert.deepEqual(state.pending, [])
    state = queryDraftReducer(state, {type: 'url', value: 'a', at: 20})
    assert.equal(state.draft, 'abc', 'a very stale echo cannot resurrect an old value')
})

test('the same value LATER is a navigation, not an echo', () => {
    // Time is the only thing that separates a late echo from pressing Back to
    // an earlier query, so the window has to expire.
    let state = run(initialQueryDraftState(''), [
        {type: 'type', value: 'heritage'},
        {type: 'emit', value: 'heritage', at: 0},
        {type: 'url', value: 'heritage', at: 10},
        {type: 'type', value: 'heritage AND conservation'},
        {type: 'emit', value: 'heritage AND conservation', at: 20},
        {type: 'url', value: 'heritage AND conservation', at: 30},
    ])
    state = queryDraftReducer(state, {type: 'url', value: 'heritage', at: 60_000})
    assert.equal(state.draft, 'heritage', 'back to the earlier query wins')
})

test('the reset button clears the box', () => {
    let state = run(initialQueryDraftState(''), [
        {type: 'type', value: 'heritage'},
        {type: 'emit', value: 'heritage', at: 0},
        {type: 'url', value: 'heritage', at: 10},
    ])
    state = queryDraftReducer(state, {type: 'url', value: '', at: 5_000})
    assert.equal(state.draft, '')
    assert.deepEqual(state.pending, [])
})

test('back/forward replaces the draft even mid-typing', () => {
    let state = run(initialQueryDraftState('old'), [
        {type: 'type', value: 'new query'},
        {type: 'emit', value: 'new query', at: 0},
        {type: 'url', value: 'new query', at: 10},
    ])
    state = queryDraftReducer(state, {type: 'url', value: 'old', at: 30_000})
    assert.equal(state.draft, 'old')
    assert.deepEqual(state.pending, [])
})

test('a suggestion click submits and its echo is recognised', () => {
    let state = run(initialQueryDraftState(''), [
        {type: 'type', value: 'photo'},
        {type: 'submit', value: 'photogrammetry', at: 0},
    ])
    assert.equal(state.draft, 'photogrammetry')
    state = queryDraftReducer(state, {type: 'url', value: 'photogrammetry', at: 10})
    assert.equal(state.draft, 'photogrammetry')
    assert.deepEqual(state.pending, [])
})

test('submit on Enter while an older write is still in flight', () => {
    let state = run(initialQueryDraftState(''), [
        {type: 'type', value: 'herita'},
        {type: 'emit', value: 'herita', at: 0},
        {type: 'type', value: 'heritage'},
        {type: 'submit', value: 'heritage', at: 5},
    ])
    state = queryDraftReducer(state, {type: 'url', value: 'herita', at: 10})
    assert.equal(state.draft, 'heritage')
    state = queryDraftReducer(state, {type: 'url', value: 'heritage', at: 15})
    assert.equal(state.draft, 'heritage')
})

test('two identical writes produce two echoes, and one does not consume both', () => {
    let state = run(initialQueryDraftState(''), [
        {type: 'type', value: 'a'},
        {type: 'emit', value: 'a', at: 0},
        {type: 'type', value: ''},
        {type: 'emit', value: '', at: 5},
        {type: 'type', value: 'a'},
        {type: 'emit', value: 'a', at: 10},
    ])
    assert.equal(state.pending.length, 3)
    state = queryDraftReducer(state, {type: 'url', value: 'a', at: 15})
    assert.deepEqual(state.pending.map((entry) => entry.value), ['', 'a'], 'only the first is consumed')
    assert.equal(state.draft, 'a')
})

test('IME: nothing is emitted or overwritten while composing', () => {
    let state = run(initialQueryDraftState(''), [{type: 'compositionStart'}, {type: 'type', value: 'にほん'}])
    assert.equal(shouldEmit(state), false, 'half-composed text is not a query')
    state = queryDraftReducer(state, {type: 'url', value: 'something else', at: 100})
    assert.equal(state.draft, 'にほん')
    state = queryDraftReducer(state, {type: 'compositionEnd', value: '日本'})
    assert.equal(state.draft, '日本')
    assert.equal(shouldEmit(state), true)
})

// --- the reported bug: Google-style syntax ----------------------------------

const SYNTAX_CASES = [
    'heritage AND conservation',
    'heritage AND ',
    '"digital heritage"',
    '"digital heritage',
    'heritage -museum',
    'heritage NOT tourism',
    '(heritage OR culture) AND 3d',
    'photogrammetry ~2',
    'trailing space ',
    'double  spaces',
]

for (const phrase of SYNTAX_CASES) {
    test(`SCRIPTED: typing ${JSON.stringify(phrase)} character by character keeps every character`, () => {
        // Every prefix is emitted (worst case: the debounce fires on each key)
        // and its echo is delivered after jittered, out-of-order delays.
        let state = initialQueryDraftState('')
        const inFlight: Array<{value: string; dueAt: number}> = []
        let seed = 991

        for (let tick = 0; tick < phrase.length; tick += 1) {
            const typed = phrase.slice(0, tick + 1)
            state = queryDraftReducer(state, {type: 'type', value: typed})

            if (shouldEmit(state)) {
                state = queryDraftReducer(state, {type: 'emit', value: state.draft, at: tick})
                seed = (seed * 1103515245 + 12345) % 2147483648
                inFlight.push({value: state.draft, dueAt: tick + 1 + (seed % 4)})
            }

            // Newest first, to force out-of-order arrival.
            for (const echo of [...inFlight].filter((entry) => entry.dueAt <= tick).reverse()) {
                state = queryDraftReducer(state, {type: 'url', value: echo.value, at: tick})
                inFlight.splice(inFlight.indexOf(echo), 1)
            }

            assert.equal(state.draft, typed, `draft intact after key ${tick + 1} of ${JSON.stringify(phrase)}`)
        }

        for (const echo of inFlight) state = queryDraftReducer(state, {type: 'url', value: echo.value, at: phrase.length})
        assert.equal(state.draft, phrase, 'the whole phrase survives')

        // At rest the URL holds exactly what was typed — no trimming, no
        // rewriting, no collapsed spaces.
        assert.equal(state.lastSeenUrl, phrase)
    })
}
