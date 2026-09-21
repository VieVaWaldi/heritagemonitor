import assert from 'node:assert/strict'
import {test} from 'node:test'
// Imported straight from source: this module is plain formatting, no React.
import {describeSearchState, formatApproxTotal, formatResultCount} from '../src/modules/search/entity/searchState.ts'

test('formatApproxTotal rounds to a precision the number can support', () => {
    assert.equal(formatApproxTotal(3_714_882), '3.7M')
    assert.equal(formatApproxTotal(1_000_000), '1M')
    assert.equal(formatApproxTotal(12_400_000), '12M')
    assert.equal(formatApproxTotal(483_214), '483k')
    assert.equal(formatApproxTotal(100_000), '100k')
    assert.equal(formatApproxTotal(48_214), '48,200')
    assert.equal(formatApproxTotal(12_347), '12,300')
    assert.equal(formatApproxTotal(10_000), '10,000')
    // Below the cap the search counted exactly, so nothing is rounded away.
    assert.equal(formatApproxTotal(9_481), '9,481')
})

test('an uncapped total is shown exactly', () => {
    assert.equal(formatResultCount({estimatedTotalHits: 17, totalCapped: false, approxTotal: null}), '17')
    assert.equal(formatResultCount({estimatedTotalHits: 2_177, totalCapped: false, approxTotal: null}), '2,177')
})

test('a capped total becomes a real magnitude once the api has counted', () => {
    assert.equal(formatResultCount({estimatedTotalHits: 10_000, totalCapped: true, approxTotal: 3_714_882}), 'about 3.7M')
    assert.equal(formatResultCount({estimatedTotalHits: 10_000, totalCapped: true, approxTotal: 25_797}), 'about 25,800')
})

test('without that count it stays an honest floor, never a fake exact number', () => {
    assert.equal(formatResultCount({estimatedTotalHits: 10_000, totalCapped: true, approxTotal: null}), '10,000+')
})

const baseState = {
    query: 'heritage',
    corpusName: 'Digital Cultural Heritage',
    sortLabel: 'Budget (high–low)',
    page: 2,
    pageCount: 12,
    count: {estimatedTotalHits: 238, totalCapped: false, approxTotal: null},
    entityNoun: 'projects',
    filters: [],
}

test('the state sentence names the query, corpus, sort, page and total', () => {
    const sentence = describeSearchState(baseState)
    assert.match(sentence, /search "heritage"/)
    assert.match(sentence, /corpus Digital Cultural Heritage/)
    assert.match(sentence, /sorted by Budget/)
    assert.match(sentence, /page 2 of 12/)
    assert.match(sentence, /238 matching projects/)
    assert.match(sentence, /no filters applied/)
})

test('active filters are spelled out, empty ones are not', () => {
    const sentence = describeSearchState({
        ...baseState,
        filters: [
            {label: 'Funder', values: ['EC', 'UKRI']},
            {label: 'Theme', values: []},
            {label: 'Years', values: ['2019-2025']},
        ],
    })
    assert.match(sentence, /filters: Funder = EC, UKRI; Years = 2019-2025/)
    assert.doesNotMatch(sentence, /Theme/)
})

test('typo-tolerant results are labelled as such, with the suggestion', () => {
    const sentence = describeSearchState({...baseState, query: 'photogramtery', fuzzy: true, didYouMean: ['photogrammetry']})
    assert.match(sentence, /TYPO-TOLERANT/)
    assert.match(sentence, /suggests: photogrammetry/)
})

test('the deepest reachable page is called out (there is no page 501)', () => {
    assert.match(describeSearchState({...baseState, page: 500, pageCount: 500}), /deepest page/)
})
