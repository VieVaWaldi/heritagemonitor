import assert from 'node:assert/strict'
import {test} from 'node:test'
// Tests run against the compiled `dist/` (the `test` script builds first), not
// `src/`: this package ships ESM with explicit `.js` specifiers, which Node's
// own TypeScript support does not rewrite back to `.ts`. Testing the built
// entry points is also what every consumer actually imports.
import {rewriteQuery, sqs, SQS_FLAGS} from '../dist/query/syntax.js'

// PARITY: every expectation below was taken from hm_pipeline's
// export/queries.py `rewrite_query`, the reference implementation. The
// interesting cases are the ones where a naive JS port diverges — Python's
// `\b`/`\w` are Unicode-aware, JS's are ASCII-only.

test('plain words are left alone', () => {
    assert.equal(rewriteQuery('photogrammetry heritage'), 'photogrammetry heritage')
    assert.equal(rewriteQuery('  spaced   out  '), 'spaced out')
    assert.equal(rewriteQuery(''), '')
})

test('AND / OR / NOT become + | -', () => {
    assert.equal(rewriteQuery('a AND b'), 'a + b')
    assert.equal(rewriteQuery('a OR b'), 'a | b')
    assert.equal(rewriteQuery('NOT x'), '-x')
    assert.equal(rewriteQuery('a AND b OR c'), 'a + b | c')
    assert.equal(rewriteQuery('photogrammetry AND heritage preservation -consumer'), 'photogrammetry + heritage preservation -consumer')
})

test('operators only count as operators on word boundaries', () => {
    // "ANDES"/"ORCHID"/"NOTHING" contain the operator words but are not operators.
    assert.equal(rewriteQuery('ANDES mountains'), 'ANDES mountains')
    assert.equal(rewriteQuery('ORCHID data'), 'ORCHID data')
    assert.equal(rewriteQuery('NOTHING works'), 'NOTHING works')
    assert.equal(rewriteQuery('bAND music'), 'bAND music')
})

test('Unicode letters count as word characters, as in Python', () => {
    // The JS trap: with an ASCII-only \b, "ä" is a non-word char, so "äAND"
    // would look like a boundary and the AND would be rewritten. Python (and
    // therefore this port) leaves it alone.
    assert.equal(rewriteQuery('äANDb'), 'äANDb')
    assert.equal(rewriteQuery('Ärchäologie AND Museum'), 'Ärchäologie + Museum')
    assert.equal(rewriteQuery('文化遺産 OR heritage'), '文化遺産 | heritage')
    assert.equal(rewriteQuery('крым NOT tourism'), 'крым -tourism')
})

test('quoted phrases are kept verbatim, operators inside them are not rewritten', () => {
    assert.equal(rewriteQuery('"digital heritage"'), '"digital heritage"')
    assert.equal(rewriteQuery('"cats AND dogs" museum'), '"cats AND dogs" museum')
    assert.equal(rewriteQuery('"digital heritage" AND museum'), '"digital heritage" + museum')
    assert.equal(rewriteQuery('"phrase~2 stays"'), '"phrase~2 stays"')
})

test('an unbalanced quote is dropped instead of swallowing the rest', () => {
    assert.equal(rewriteQuery('"digital heritage'), 'digital heritage')
    assert.equal(rewriteQuery('museum "digital'), 'museum digital')
    assert.equal(rewriteQuery('"a" "b'), '"a" b')
})

test('~N is stripped (the FUZZY/SLOP flags are off, word~2 would mean "word AND 2")', () => {
    assert.equal(rewriteQuery('word~2'), 'word')
    assert.equal(rewriteQuery('word~'), 'word')
    assert.equal(rewriteQuery('heritage~2 AND museum'), 'heritage + museum')
})

test('dangling operators at either end are removed', () => {
    assert.equal(rewriteQuery('AND heritage'), 'heritage')
    assert.equal(rewriteQuery('heritage AND'), 'heritage')
    assert.equal(rewriteQuery('heritage OR'), 'heritage')
    assert.equal(rewriteQuery('OR'), '')
    assert.equal(rewriteQuery('NOT'), 'NOT')
})

test('colons are passed through (a lucene-style field query is just text here)', () => {
    // simple_query_string has no field syntax, so `title:heritage` is searched
    // literally rather than erroring — same as Python.
    assert.equal(rewriteQuery('title:heritage'), 'title:heritage')
})

test('sqs builds a simple_query_string clause with the measured flags', () => {
    assert.deepEqual(sqs('a AND b', ['title^3']), {
        simple_query_string: {
            query: 'a + b',
            fields: ['title^3'],
            default_operator: 'AND',
            flags: SQS_FLAGS,
            lenient: true,
            analyze_wildcard: false,
        },
    })
})

test('sqs falls back to match_all when nothing searchable is left', () => {
    assert.deepEqual(sqs('', ['title']), {match_all: {}})
    assert.deepEqual(sqs('   ', ['title']), {match_all: {}})
    assert.deepEqual(sqs('OR', ['title']), {match_all: {}})
})
