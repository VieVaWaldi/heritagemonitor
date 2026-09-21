import assert from 'node:assert/strict'
import {test} from 'node:test'
import type {OrganisationNetworkResponse} from '@heritagemonitor/shared'
import {
    arcLinks,
    arcNodes,
    centreProjectsPath,
    findNode,
    formatShared,
    networkFilterQuery,
    networkPath,
    nodeSubtitle,
    pageCountOf,
    pageOf,
    partnerChatRow,
    sharedProjectsPath,
} from '../src/modules/search/collaboration/networkAdapter.ts'
import {applyPatch, buildFocusPatch, buildSuggestionLink, patchClearsSelection, SEARCH_PARAM, URL_PARAM_LABELS} from '../src/common/url/codecs.ts'
import {describeLinkVocabulary} from '../src/common/url/linkVocabulary.ts'

const node = (id: string, w: number, lat: number | null = 50, lng: number | null = 8, ids = [id]) => ({id, ids, name: `Org ${id}`, lat, lng, w, countryCode: 'DE'})
const network: OrganisationNetworkResponse = {
    nodes: [node('c', 900), node('p1', 30), node('p2', 10, 48, 2, ['p2', 'p2b'])],
    edges: [
        {a: 0, b: 1, w: 30},
        {a: 0, b: 2, w: 10},
    ],
    meta: {partners: 3, withoutGeo: 1, capped: false, complete: true},
}

test('arcs go from the centre to every partner, weighted by shared projects', () => {
    const links = arcLinks(network)
    assert.deepEqual(links.map((link) => [link.id, link.weight]), [['p1', 30], ['p2', 10]])
    assert.deepEqual(links[0].source, [8, 50])
    assert.deepEqual(links[1].target, [2, 48])
})

test('a centre without coordinates draws no arcs; icons only for the placed ones', () => {
    const noGeo = {...network, nodes: [node('c', 900, null, null), ...network.nodes.slice(1)]}
    assert.deepEqual(arcLinks(noGeo), [])
    assert.deepEqual(arcNodes(noGeo).map((n) => n.id), ['p1', 'p2'])
})

test('the centre is the hub node; partners are single links', () => {
    const nodes = arcNodes(network)
    assert.equal(nodes[0].linkCount, 2)
    assert.equal(nodes[1].linkCount, 1)
})

test('the network request carries the corpus and project filters only', () => {
    const params = new URLSearchParams('center=c&sel=p1&tab=map&view=1,2,3&q=x&page=2&c=dch&years=2019-2025&funder=EC&funder=NIH&topic=7')
    assert.equal(networkFilterQuery(params), 'c=dch&years=2019-2025&funder=EC&funder=NIH&topic=7')
    assert.equal(networkPath('a b', 'c=dch'), '/v1/collaboration/organisations/a%20b/network?c=dch')
    assert.equal(networkPath('c', ''), '/v1/collaboration/organisations/c/network')
})

test('shared projects need AND: the centre in orgAll, any record of the partner in org', () => {
    const path = sharedProjectsPath('c', ['p2', 'p2b'], 1, 'c=dch')
    const query = new URL(path, 'http://x').searchParams
    assert.equal(query.get('orgAll'), 'c')
    assert.deepEqual(query.getAll('org'), ['p2', 'p2b'])
    assert.equal(query.get('c'), 'dch')
    assert.equal(new URL(centreProjectsPath('c', 2, ''), 'http://x').searchParams.get('orgAll'), 'c')
})

test('list paging and wording', () => {
    const items = Array.from({length: 45}, (_, i) => i)
    assert.equal(pageOf(items, 3).length, 5)
    assert.equal(pageCountOf(45), 3)
    assert.equal(pageCountOf(0), 1)
    assert.equal(formatShared(1), '1 shared project')
    assert.equal(nodeSubtitle(node('c', 900), true), 'DE · 900 projects')
    assert.equal(nodeSubtitle(node('p1', 30), false), 'DE · 30 shared projects')
    assert.equal(partnerChatRow(node('p1', 30)), '- [p1] Org p1 (DE, 30 shared projects)')
})

test('a partner is found by its representative id or by a merged duplicate id', () => {
    assert.equal(findNode(network, 'p2b')?.id, 'p2')
    assert.equal(findNode(network, 'p1')?.id, 'p1')
    assert.equal(findNode(network, 'zzz'), null)
    assert.equal(findNode(network, null), null)
})

test('picking a suggestion centres the network: link from the landing page and patch in place', () => {
    const url = new URL(buildSuggestionLink({route: '/search/collaboration/organisationNetwork', entity: 'organisations', id: '42', corpus: 'dch', focus: 'center'}), 'http://x')
    assert.equal(url.pathname, '/search/collaboration/organisationNetwork')
    assert.equal(url.searchParams.get('center'), '42')
    assert.equal(url.searchParams.get('sel'), '42')
    assert.equal(url.searchParams.get('c'), 'dch')
    assert.equal(url.searchParams.has('only'), false)
    assert.equal(url.searchParams.has('q'), false)

    const before = new URLSearchParams('e=organisations&c=dch&q=x&funder=EC&view=1,2,3&center=7&sel=9&tab=projects')
    const after = applyPatch(before, buildFocusPatch(before, '42', 'center'))
    assert.deepEqual(Object.fromEntries(after), {e: 'organisations', c: 'dch', center: '42', sel: '42'})
})

test('other entities keep the only+sel link', () => {
    const url = new URL(buildSuggestionLink({route: '/search', entity: 'projects', id: '5', corpus: 'dch'}), 'http://x')
    assert.equal(url.searchParams.get('only'), '5')
    assert.equal(url.searchParams.has('center'), false)
})

test('a new centre clears the selected partner unless the same patch sets one; both params are labelled for Lucy', () => {
    assert.equal(patchClearsSelection({center: '42'}), true)
    assert.equal(patchClearsSelection({center: '42', sel: '42'}), false)
    assert.ok(URL_PARAM_LABELS[SEARCH_PARAM.center].length > 0)
    assert.ok(URL_PARAM_LABELS[SEARCH_PARAM.orgAll].length > 0)
    assert.ok(describeLinkVocabulary().join(' ').includes('organisationNetwork?center='))
})
