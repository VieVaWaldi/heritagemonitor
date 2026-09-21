import assert from 'node:assert/strict'
import {test} from 'node:test'
import {typoFallbackAllowed} from '../dist/common/search/typoPolicy.js'

test('a text query may fall back to the typo-tolerant rerun', () => {
    assert.equal(typoFallbackAllowed('bim', undefined), true)
})

test('strict=true disables the fallback: a list under a parent count must not become a looser search', () => {
    assert.equal(typoFallbackAllowed('bim', 'true'), false)
})

test('a blank query never falls back, strict or not', () => {
    assert.equal(typoFallbackAllowed('', undefined), false)
    assert.equal(typoFallbackAllowed('   ', undefined), false)
    assert.equal(typoFallbackAllowed(undefined, undefined), false)
})

test('only the exact value "true" means strict', () => {
    assert.equal(typoFallbackAllowed('bim', 'false'), true)
    assert.equal(typoFallbackAllowed('bim', ''), true)
})
