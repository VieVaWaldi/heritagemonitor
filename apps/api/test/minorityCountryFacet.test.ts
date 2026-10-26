import assert from 'node:assert/strict'
import {test} from 'node:test'
import {applyGlobalCountryCount} from '../dist/modules/minorities/minorities.service.js'

// The country facet has to agree with what clicking it returns. A global group
// matches every country filter, so every bucket is short by the number of
// global groups under the current search.

test('the global count is added to every country bucket', () => {
    assert.deepEqual(applyGlobalCountryCount({Germany: 12, Poland: 7}, 1), {Germany: 13, Poland: 8})
})

test('the raw placeholder bucket is hidden — it is not a country', () => {
    const adjusted = applyGlobalCountryCount({Germany: 12, '(global — see subgroups in dataset)': 1}, 1)
    assert.deepEqual(adjusted, {Germany: 13})
})

test('no global groups under the current search leaves the buckets untouched', () => {
    assert.deepEqual(applyGlobalCountryCount({Germany: 12, Poland: 7}, 0), {Germany: 12, Poland: 7})
})

test('an empty facet stays empty', () => {
    assert.deepEqual(applyGlobalCountryCount({}, 3), {})
})
