import assert from 'node:assert/strict'
import {test} from 'node:test'
// Tests run against the compiled `dist/` (the `test` script builds first), not
// `src/`: this package ships ESM with explicit `.js` specifiers, which Node's
// own TypeScript support does not rewrite back to `.ts`. Testing the built
// entry points is also what every consumer actually imports.
import {fuzzyQuery, readDidYouMean, splitTerms, suggestBlock, TYPO_POLICY} from '../dist/query/typo.js'

// PARITY: every expectation was produced by running hm_pipeline's
// export/queries.py (`split_terms`, `fuzzy_query`, `suggest_block`) on the
// same input — that module is the reference these were measured against.

test('splitTerms separates the words that must match from the ones that must not', () => {
    const cases: Array<[string, string, string[]]> = [
        ['photogrammetry heritage', 'photogrammetry heritage', []],
        ['heritage -museum', 'heritage', ['museum']],
        ['a AND b OR c', 'a b c', []],
        ['NOT x', '', ['x']],
        ['"digital heritage" -museum', 'digital heritage', ['museum']],
        ['(a OR b) c', 'a b c', []],
        ['heritage~2', 'heritage', []],
        ['-museum', '', ['museum']],
        ['photogramtery', 'photogramtery', []],
        ['  ', '', []],
        ['a -b -c', 'a', ['b', 'c']],
        ['x AND -y', 'x', ['y']],
    ]
    for (const [input, positive, negative] of cases) {
        assert.deepEqual(splitTerms(input), {positive, negative}, input)
    }
})

test('splitTerms treats Unicode letters as word characters, as Python does', () => {
    assert.deepEqual(splitTerms('Ärchäologie -Museum'), {positive: 'Ärchäologie', negative: ['Museum']})
    assert.deepEqual(splitTerms('крым -tourism'), {positive: 'крым', negative: ['tourism']})
})

test('fuzzyQuery matches every positive word with AUTO fuzziness and a 2-character prefix', () => {
    assert.deepEqual(fuzzyQuery('heritag', ['title^3']), {
        multi_match: {
            query: 'heritag',
            fields: ['title^3'],
            type: 'best_fields',
            operator: 'and',
            fuzziness: 'AUTO',
            prefix_length: 2,
            max_expansions: 20,
            fuzzy_transpositions: true,
        },
    })
})

test('negations stay strict in the fuzzy rerun', () => {
    const query = fuzzyQuery('heritag -museum', ['title^3']) as {bool: {must: unknown; must_not: unknown[]}}
    assert.deepEqual(query.bool.must_not, [{multi_match: {query: 'museum', fields: ['title^3']}}])
})

test('a query with nothing positive left falls back to match_all', () => {
    assert.deepEqual(fuzzyQuery('', ['title^3']), {match_all: {}})
    assert.deepEqual(fuzzyQuery('-museum', ['title^3']), {match_all: {}})
})

test('suggestBlock asks the term suggester only about words the index does not know', () => {
    assert.deepEqual(suggestBlock('photogramtery', 'title'), {
        text: 'photogramtery',
        did_you_mean: {term: {field: 'title', suggest_mode: 'missing', min_word_length: 4, prefix_length: 2, size: 3}},
    })
})

test('the measured per-index typo budgets are carried over unchanged', () => {
    assert.deepEqual(TYPO_POLICY.projects, {threshold: 5, maxExpansions: 20, timeout: '2s', suggestField: 'title'})
    assert.equal(TYPO_POLICY.works.threshold, 3)
    assert.equal(TYPO_POLICY.works.timeout, '1500ms')
})

test('readDidYouMean flattens the suggester response and drops duplicates', () => {
    assert.deepEqual(
        readDidYouMean({did_you_mean: [{options: [{text: 'photogrammetry'}, {text: 'photogrammetric'}]}, {options: [{text: 'photogrammetry'}]}]}),
        ['photogrammetry', 'photogrammetric'],
    )
    assert.deepEqual(readDidYouMean(undefined), [])
    assert.deepEqual(readDidYouMean({did_you_mean: [{options: []}]}), [])
})
