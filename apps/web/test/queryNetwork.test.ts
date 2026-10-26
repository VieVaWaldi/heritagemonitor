import assert from 'node:assert/strict'
import {test} from 'node:test'
import type {QueryNetworkResponse} from '@heritagemonitor/shared'
import {
    basisNote,
    byIdOrder,
    matchingProjectsPath,
    projectsByIdsPath,
    queryNetworkFilterQuery,
    queryNetworkPath,
} from '../src/modules/search/collaboration/queryNetworkAdapter.ts'
import {patchClearsSelection, readMaxEdges, SEARCH_PARAM, toApiSearchParams, URL_PARAM_LABELS} from '../src/common/url/codecs.ts'
import {describeLinkVocabulary} from '../src/common/url/linkVocabulary.ts'

const meta: QueryNetworkResponse['meta'] = {projectsScanned: 2000, totalMatches: 10000, totalCapped: true, approxTotal: 25797, edgesFound: 50, capped: true, withoutGeo: 1, mode: 'strict', didYouMean: [], complete: true}

test('the request carries q, the corpus and the project filters, plus the edge cap', () => {
    const params = new URLSearchParams('q=archaeology&c=dch&years=2019-2025&funder=EC&topic=7&sel=2&tab=graph&layer=arcs&maxEdges=50&view=1,2,3&page=2')
    const filterQuery = queryNetworkFilterQuery(params)
    assert.equal(filterQuery, 'c=dch&q=archaeology&years=2019-2025&funder=EC&topic=7')
    const path = new URL(queryNetworkPath(filterQuery, 50), 'http://x')
    assert.equal(path.pathname, '/v1/collaboration/query-network')
    assert.equal(path.searchParams.get('maxEdges'), '50')
    assert.equal(path.searchParams.get('q'), 'archaeology')
    assert.equal(path.searchParams.has('layer'), false)
    assert.equal(path.searchParams.has('sel'), false)
    assert.equal(new URL(matchingProjectsPath('q=x', 3), 'http://x').searchParams.get('page'), '3')
})

test('projects by ids: one `only` per id, and rows come back in the ranking order of the ids', () => {
    const path = new URL(projectsByIdsPath(['p9', 'p3', 'p5']), 'http://x')
    assert.deepEqual(path.searchParams.getAll('only'), ['p9', 'p3', 'p5'])
    const rows = [{id: 'p3'}, {id: 'zzz'}, {id: 'p5'}, {id: 'p9'}]
    assert.deepEqual(byIdOrder(rows, ['p9', 'p3', 'p5']).map((row) => row.id), ['p9', 'p3', 'p5'])
})

test('the basis note says what the picture is based on', () => {
    assert.equal(basisNote(meta), 'Based on the top 2,000 of about 25,797 matching projects.')
    assert.equal(basisNote({...meta, projectsScanned: 40, totalMatches: 40, totalCapped: false, approxTotal: null}), 'Based on all 40 matching projects.')
    assert.equal(basisNote({...meta, approxTotal: null}), 'Based on the top 2,000 of more than 10,000 matching projects.')
})

test('maxEdges is clamped, defaults, and never reaches the search endpoints', () => {
    const bounds = {min: 10, max: 300, fallback: 100}
    assert.equal(readMaxEdges(new URLSearchParams(''), bounds), 100)
    assert.equal(readMaxEdges(new URLSearchParams('maxEdges=150'), bounds), 150)
    assert.equal(readMaxEdges(new URLSearchParams('maxEdges=99999'), bounds), 300)
    assert.equal(readMaxEdges(new URLSearchParams('maxEdges=2'), bounds), 10)
    assert.equal(readMaxEdges(new URLSearchParams('maxEdges=abc'), bounds), 100)
    assert.equal(toApiSearchParams(new URLSearchParams('q=x&maxEdges=50&layer=arcs')), 'q=x')
})

test('the params are labelled for Lucy and in the link vocabulary; a new query clears the selected cluster', () => {
    assert.ok(URL_PARAM_LABELS[SEARCH_PARAM.maxEdges].length > 0)
    const vocabulary = describeLinkVocabulary().join(' ')
    assert.ok(vocabulary.includes('maxEdges'))
    assert.ok(vocabulary.includes('one of network|arcs'))
    assert.ok(vocabulary.includes('/search/collaboration/queryNetwork'))
    assert.ok(vocabulary.includes('cluster'), 'the query network route explains clusters and sel')
    assert.equal(patchClearsSelection({q: 'x'}), true)
    assert.equal(patchClearsSelection({funder: ['EC']}), false)
})

test('the landing page sends a query to the query network route with q, entity and corpus', async () => {
    const {buildSearchUrl} = await import('../src/common/url/codecs.ts')
    const url = new URL(buildSearchUrl({route: '/search/collaboration/queryNetwork', query: 'digital archaeology', entity: 'projects', corpus: 'dch'}), 'http://x')
    assert.equal(url.pathname, '/search/collaboration/queryNetwork')
    assert.equal(url.searchParams.get('q'), 'digital archaeology')
    assert.equal(url.searchParams.get('e'), 'projects')
    assert.equal(url.searchParams.get('c'), 'dch')
})
