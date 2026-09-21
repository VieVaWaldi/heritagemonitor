import assert from 'node:assert/strict'
import {test} from 'node:test'
import type {QueryNetworkResponse} from '@heritagemonitor/shared'
import {
    basisNote,
    edgeArcLinks,
    edgeArcNodes,
    edgeChatRow,
    edgeId,
    edgeProjectsPath,
    edgeSubtitle,
    findEdge,
    matchingProjectsPath,
    queryEdges,
    queryNetworkFilterQuery,
    queryNetworkPath,
} from '../src/modules/search/collaboration/queryNetworkAdapter.ts'
import {patchClearsSelection, readMaxEdges, SEARCH_PARAM, toApiSearchParams, URL_PARAM_LABELS} from '../src/common/url/codecs.ts'
import {describeLinkVocabulary} from '../src/common/url/linkVocabulary.ts'

const node = (id: string, lat: number | null = 50, lng: number | null = 8, ids = [id]) => ({id, ids, name: `Org ${id}`, lat, lng, w: 5, countryCode: 'DE'})
const network: QueryNetworkResponse = {
    nodes: [node('a'), node('b', 48, 2, ['b', 'b2']), node('c', null, null)],
    edges: [
        {a: 0, b: 1, w: 9},
        {a: 0, b: 2, w: 4},
    ],
    meta: {projectsScanned: 2000, totalMatches: 10000, totalCapped: true, approxTotal: 25797, edgesFound: 50, capped: true, withoutGeo: 1, mode: 'strict', didYouMean: [], complete: true},
}

test('the request carries q, the corpus and the project filters, plus the edge cap', () => {
    const params = new URLSearchParams('q=archaeology&c=dch&years=2019-2025&funder=EC&topic=7&sel=a:b&tab=graph&layer=arcs&maxEdges=50&view=1,2,3&page=2')
    const filterQuery = queryNetworkFilterQuery(params)
    assert.equal(filterQuery, 'c=dch&q=archaeology&years=2019-2025&funder=EC&topic=7')
    const path = new URL(queryNetworkPath(filterQuery, 50), 'http://x')
    assert.equal(path.pathname, '/v1/collaboration/query-network')
    assert.equal(path.searchParams.get('maxEdges'), '50')
    assert.equal(path.searchParams.get('q'), 'archaeology')
    assert.equal(path.searchParams.has('layer'), false)
})

test('edges keep the api order, strongest first, with a stable selection id', () => {
    const edges = queryEdges(network)
    assert.deepEqual(edges.map((edge) => [edge.id, edge.w]), [['a:b', 9], ['a:c', 4]])
    assert.equal(findEdge(edges, 'a:c')?.b.id, 'c')
    assert.equal(findEdge(edges, 'zzz'), null)
    assert.equal(findEdge(edges, null), null)
    assert.equal(edgeId(network.nodes[0], network.nodes[1]), 'a:b')
})

test('the shared projects of an edge are AND across the pair: first side in orgAll, any record of the other in org', () => {
    const [edge] = queryEdges(network)
    const path = new URL(edgeProjectsPath(edge, 2, 'q=archaeology&c=dch'), 'http://x')
    assert.equal(path.searchParams.get('orgAll'), 'a')
    assert.deepEqual(path.searchParams.getAll('org'), ['b', 'b2'])
    assert.equal(path.searchParams.get('q'), 'archaeology')
    assert.equal(path.searchParams.get('page'), '2')
    assert.equal(new URL(matchingProjectsPath('q=x', 3), 'http://x').searchParams.get('page'), '3')
})

test('arcs are drawn only where both ends have coordinates; icons only for located organisations', () => {
    const edges = queryEdges(network)
    const links = edgeArcLinks(edges)
    assert.deepEqual(links.map((link) => link.id), ['a:b'])
    assert.deepEqual(links[0].target, [2, 48])
    assert.deepEqual(edgeArcNodes(network, edges).map((n) => n.id), ['a', 'b'])
})

test('list wording, Lucy row and the basis note', () => {
    const [edge] = queryEdges(network)
    assert.equal(edgeSubtitle(edge), '9 shared projects · DE – DE')
    assert.equal(edgeChatRow(edge), '- Org a <-> Org b (9 shared projects)')
    assert.equal(basisNote(network.meta), 'Based on the top 2,000 of about 25,797 matching projects.')
    assert.equal(basisNote({...network.meta, projectsScanned: 40, totalMatches: 40, totalCapped: false, approxTotal: null}), 'Based on all 40 matching projects.')
    assert.equal(basisNote({...network.meta, approxTotal: null}), 'Based on the top 2,000 of more than 10,000 matching projects.')
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

test('the new params are labelled for Lucy, in the link vocabulary, and a query change clears the selected edge', () => {
    assert.ok(URL_PARAM_LABELS[SEARCH_PARAM.maxEdges].length > 0)
    const vocabulary = describeLinkVocabulary().join(' ')
    assert.ok(vocabulary.includes('maxEdges'))
    assert.ok(vocabulary.includes('one of network|arcs'))
    assert.ok(vocabulary.includes('/search/collaboration/queryNetwork'))
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
