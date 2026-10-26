import assert from 'node:assert/strict'
import {test} from 'node:test'
// Tests run against the compiled `dist/` (the `test` script builds first), not
// `src/`: this package ships ESM with explicit `.js` specifiers, which Node's
// own TypeScript support does not rewrite back to `.ts`.
import {containsRegexp, facetValuesAgg, MAX_FACET_VALUES} from '../dist/query/facetValues.js'

test('a plain word becomes a case-insensitive contains pattern', () => {
    // Lucene regexp has no (?i) flag, so each cased letter carries its own class.
    assert.equal(containsRegexp('h2020'), '.*[hH]2020.*')
    assert.equal(containsRegexp('ERC'), '.*[eE][rR][cC].*')
})

test('regexp syntax in the query is escaped, never executed', () => {
    // Without escaping, `.` and `*` would match far more than typed, and an
    // unbalanced `(` or `[` would make OpenSearch reject the whole request.
    assert.equal(containsRegexp('a.b'), '.*[aA]\\.[bB].*')
    assert.equal(containsRegexp('x*'), '.*[xX]\\*.*')
    assert.equal(containsRegexp('('), '.*\\(.*')
    // `-` only means a range INSIDE a class, and user input never lands
    // inside one, so it stays a literal.
    assert.equal(containsRegexp('[a-z]'), '.*\\[[aA]-[zZ]\\].*')
    assert.equal(containsRegexp('a|b'), '.*[aA]\\|[bB].*')
    assert.equal(containsRegexp('back\\slash'), '.*[bB][aA][cC][kK]\\\\[sS][lL][aA][sS][hH].*')
})

test('characters that have no case and no meaning pass through', () => {
    assert.equal(containsRegexp('nsf/oad_1'), '.*[nN][sS][fF]/[oO][aA][dD]_1.*')
})

test('an empty query means no restriction at all', () => {
    assert.equal(containsRegexp(''), null)
    assert.equal(containsRegexp('   '), null)
    assert.equal(facetValuesAgg('programme').terms.include, undefined)
})

test('the aggregation keeps an explicit shard_size and a capped size', () => {
    const agg = facetValuesAgg('programme', {q: 'h2020', size: 25})
    assert.equal(agg.terms.field, 'programme')
    assert.equal(agg.terms.size, 25)
    assert.equal(agg.terms.shard_size, 500)
    assert.equal(agg.terms.include, '.*[hH]2020.*')
})

test('size is clamped into a sane range', () => {
    assert.equal(facetValuesAgg('programme', {size: 10_000}).terms.size, MAX_FACET_VALUES)
    assert.equal(facetValuesAgg('programme', {size: 0}).terms.size, 1)
    assert.equal(facetValuesAgg('programme', {size: -5}).terms.size, 1)
})
