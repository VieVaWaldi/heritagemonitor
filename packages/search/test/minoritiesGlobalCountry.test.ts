import assert from 'node:assert/strict'
import {test} from 'node:test'
// Tests run against the compiled `dist/` (the `test` script builds first).
import {GLOBAL_COUNTRY_PLACEHOLDER, minorityFilters} from '../dist/query/minorities.js'

// One group (Q7325, Jewish people) has no country of its own — the pipeline
// writes a placeholder instead. It has to match every country filter, or a
// diaspora becomes invisible the moment anyone picks a country.

test('a country filter also matches the global placeholder', () => {
    const clauses = minorityFilters({country: ['Germany']})
    assert.deepEqual(clauses, [
        {
            bool: {
                should: [
                    {terms: {'countries.keyword': ['Germany']}},
                    {term: {'countries.keyword': GLOBAL_COUNTRY_PLACEHOLDER}},
                ],
                minimum_should_match: 1,
            },
        },
    ])
})

test('several countries still get exactly one global clause', () => {
    const clauses = minorityFilters({country: ['Germany', 'Poland']})
    const should = (clauses[0] as {bool: {should: unknown[]}}).bool.should
    assert.equal(should.length, 2)
    assert.deepEqual(should[0], {terms: {'countries.keyword': ['Germany', 'Poland']}})
})

test('no country filter means no country clause at all', () => {
    assert.deepEqual(minorityFilters({}), [])
    // Other facets keep their plain `terms` shape — only country is special.
    assert.deepEqual(minorityFilters({religion: ['Judaism']}), [{terms: {'religions.keyword': ['Judaism']}}])
})

test('the country rule does not leak into the other text-with-keyword facets', () => {
    const clauses = minorityFilters({country: ['Germany'], language: ['Yiddish']})
    assert.equal(clauses.length, 2)
    assert.deepEqual(clauses[1], {terms: {'native_languages.keyword': ['Yiddish']}})
})
