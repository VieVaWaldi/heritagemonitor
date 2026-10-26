import assert from 'node:assert/strict'
import {test} from 'node:test'
import type {QueryNetworkResponse} from '@heritagemonitor/shared'
import {
    buildClusterModel,
    clusterTitles,
    findCluster,
    hingeOtherClusters,
    HINGE_MIN_DEGREE,
    participationCoefficient,
} from '../src/modules/search/collaboration/clusters.ts'

// Two tight groups (a: x0-x3, b: y0-y3) joined only through h, which works
// with both. Node indexes: x0..x3 = 0..3, y0..y3 = 4..7, h = 8.
const names = ['x0', 'x1', 'x2', 'x3', 'y0', 'y1', 'y2', 'y3', 'h']
const countries = ['IT', 'IT', 'UK', 'IT', 'DE', 'DE', 'DE', 'FR', 'IT']
const nodes = names.map((name, i) => ({id: name, ids: [name], name: name.toUpperCase(), lat: 50, lng: 8, w: 5, countryCode: countries[i]}))
const clique = (from: number, weight: number) => {
    const out: Array<{a: number; b: number; w: number}> = []
    for (let i = 0; i < 4; i += 1) for (let j = i + 1; j < 4; j += 1) out.push({a: from + i, b: from + j, w: weight})
    return out
}
const edges = [...clique(0, 6), ...clique(4, 3), {a: 8, b: 0, w: 2}, {a: 8, b: 1, w: 2}, {a: 8, b: 4, w: 2}, {a: 8, b: 5, w: 2}]

// projects (ranking order): 0 all x; 1 x0+x1+h; 2 x1+y0 (bridge); 3 y0+y1+y2; 4 y3 alone; 5 x0+y0+y1 (bridge, 2 of 3 in b)
const projects = {
    ids: ['p0', 'p1', 'p2', 'p3', 'p4', 'p5'],
    orgs: [[0, 1, 2, 3], [0, 1, 8], [1, 4], [4, 5, 6], [7], [0, 4, 5]],
    topic: [0, 0, 1, 1, 1, 1],
    year: [2018, 2020, 2021, 0, 2015, 2019],
    amount: [1000, 500, 200, 0, 100, 300],
    funder: [0, 0, 1, 1, -1, 1],
}
const network: QueryNetworkResponse = {
    nodes,
    edges,
    projects,
    topics: ['T-arch', 'T-3d'],
    funders: ['EC', 'NIH'],
    meta: {projectsScanned: 2000, totalMatches: 100, totalCapped: false, approxTotal: null, edgesFound: 16, capped: false, withoutGeo: 0, mode: 'strict', didYouMean: [], complete: true},
}

test('two tight groups become two clusters, ranked by shared projects inside, with stable ids', () => {
    const model = buildClusterModel(network)
    assert.equal(model.clusters.length, 2)
    const [first, second] = model.clusters
    assert.equal(first.id, '1')
    assert.equal(second.id, '2')
    // group x: 6 edges x weight 6 = 36; group y: 6 x 3 = 18, plus h's two links into it (2 + 2) when h joins y
    assert.equal(first.strength, 36)
    assert.ok(second.strength >= 18 && second.strength < first.strength)
    assert.deepEqual(new Set(first.members.filter((m) => m < 4)), new Set([0, 1, 2, 3]))
    // same network, same answer, every time
    const again = buildClusterModel(network)
    assert.deepEqual(again.clusters.map((c) => [c.id, c.members, c.strength]), model.clusters.map((c) => [c.id, c.members, c.strength]))
    assert.deepEqual([...again.clusterOfNode], [...model.clusterOfNode])
})

test('ties in strength break by size, then by the smallest member id — never by iteration order', () => {
    const tie = buildClusterModel({
        ...network,
        nodes: nodes.slice(0, 8),
        edges: [...clique(0, 5), ...clique(4, 5)],
        projects: {ids: [], orgs: [], topic: [], year: [], amount: [], funder: []},
    })
    assert.deepEqual(tie.clusters.map((c) => c.strength), [30, 30])
    // equal strength and size: the group containing the smaller id (x0 < y0) comes first
    assert.ok(tie.clusters[0].members.includes(0))
})

test('participation coefficient: 0 inside one cluster, higher the more evenly links are spread', () => {
    assert.equal(participationCoefficient([]), 0)
    assert.equal(participationCoefficient([7]), 0)
    assert.equal(participationCoefficient([5, 5]), 0.5)
    assert.ok(participationCoefficient([1, 1, 1]) > participationCoefficient([5, 5]))
    assert.ok(Math.abs(participationCoefficient([3, 1]) - (1 - (0.75 ** 2 + 0.25 ** 2))) < 1e-12)
})

test('the hinge organisation is the one working with both groups; group members are not hinges', () => {
    const model = buildClusterModel(network)
    assert.deepEqual(model.hinges.map((h) => nodes[h.node].id), ['h'])
    const [hinge] = model.hinges
    assert.ok(hinge.degree >= HINGE_MIN_DEGREE)
    assert.equal(hinge.participation, 0.5)
    assert.equal(hinge.clusters.length, 2)
    const own = model.clusterOfNode.get(hinge.node)
    assert.equal(hingeOtherClusters(hinge, own).length, 1)
    assert.ok(model.clusters.some((cluster) => cluster.hingeNodes.includes(hinge.node)))
})

test('a node below the degree threshold is not a hinge even if it links two clusters', () => {
    const thin = buildClusterModel({...network, edges: [...clique(0, 6), ...clique(4, 3), {a: 8, b: 0, w: 2}, {a: 8, b: 4, w: 2}]})
    assert.deepEqual(thin.hinges, [])
})

test('projects go to the cluster holding the majority of their organisations; bridges span two or more', () => {
    const model = buildClusterModel(network)
    const byProject = new Map(model.placements.map((p) => [p.project, p]))
    const xCluster = model.clusterOfNode.get(0)!
    const yCluster = model.clusterOfNode.get(4)!
    assert.equal(byProject.get(0)!.cluster, xCluster)
    assert.equal(byProject.get(0)!.isBridge, false)
    assert.equal(byProject.get(1)!.cluster, xCluster, 'x0+x1+h: h is in a cluster too, x holds the majority')
    assert.equal(byProject.get(3)!.cluster, yCluster)
    // p5: x0 + y0 + y1 -> majority y, spans both
    assert.equal(byProject.get(5)!.cluster, yCluster)
    assert.deepEqual(byProject.get(5)!.span, [yCluster, xCluster])
    assert.equal(byProject.get(5)!.isBridge, true)
    assert.equal(byProject.get(2)!.isBridge, true)
})

test('hinge projects are ranked by clusters spanned, then organisations, then ranking position', () => {
    const model = buildClusterModel(network)
    const order = model.hingeProjects.map((p) => p.project)
    // h sits in the y cluster, so p1 (x0 + x1 + h) also spans two clusters. p1 and p5 have three
    // organisations each (ranking position breaks the tie), p2 has two.
    assert.deepEqual(order, [1, 5, 2])
    assert.ok(model.hingeProjects.every((p) => p.span.length >= 2))
})

test('cluster facts: assigned projects, budget, years, funders, topics, countries, leads', () => {
    const model = buildClusterModel(network)
    const x = findCluster(model, model.clusterOfNode.get(0)!)!
    assert.deepEqual(x.projects, [0, 1, 2].filter((p) => model.placements.find((pl) => pl.project === p)!.cluster === x.id))
    assert.equal(x.funding, x.projects.reduce((sum, p) => sum + projects.amount[p], 0))
    const years = x.projects.map((p) => projects.year[p]).filter((year) => year > 0)
    assert.deepEqual(x.years, [Math.min(...years), Math.max(...years)])
    assert.equal(x.topCountries[0].key, 'IT')
    assert.equal(x.leads.length, 4)
    assert.ok(x.leads[0].weight >= x.leads[1].weight)
    assert.ok(x.topFunders.every((share) => share.share > 0 && share.share <= 1))
    const y = findCluster(model, model.clusterOfNode.get(4)!)!
    // p4 has no funder (-1): not counted in the funder shares
    assert.ok(y.topFunders.reduce((sum, share) => sum + share.count, 0) < y.projects.length + 1)
    assert.equal(findCluster(model, '99'), null)
    assert.equal(findCluster(model, null), null)
})

test('an empty network has an empty model', () => {
    const model = buildClusterModel({...network, nodes: [], edges: []})
    assert.equal(model.clusters.length, 0)
    assert.equal(model.hinges.length, 0)
})

test('titles: top topic + lead countries, led-by subtitle', () => {
    const model = buildClusterModel(network)
    const titles = clusterTitles(model.clusters, nodes, (id) => ({'T-arch': 'Archaeology', 'T-3d': '3D scanning'})[id] ?? null)
    for (const cluster of model.clusters) {
        const {title, subtitle} = titles.get(cluster.id)!
        assert.ok(title.includes(' · '), title)
        assert.match(subtitle, /^led by /)
    }
    const x = model.clusters.find((c) => c.members.includes(0))!
    assert.match(titles.get(x.id)!.title, /· IT/)
})

test('titles: no topic data falls back to "Cluster N: <lead> and partners"', () => {
    const model = buildClusterModel({...network, topics: [], funders: [], projects: {...projects, topic: projects.topic.map(() => -1)}})
    const titles = clusterTitles(model.clusters, nodes, () => null)
    const first = titles.get('1')!
    assert.match(first.title, /^Cluster 1: [A-Z0-9]+ and partners$/)
})

test('titles: identical titles are told apart by the lead organisation, then by the id', () => {
    const model = buildClusterModel(network)
    // same topic and same countries, different leads (node 0 vs node 4)
    const sameCountries = model.clusters.map((cluster, index) => ({...cluster, leads: [{node: index === 0 ? 0 : 4, weight: 1}], topCountries: [{key: 'IT', count: 1, share: 1}]}))
    const byLead = [...clusterTitles(sameCountries, nodes, () => 'Same topic').values()].map((entry) => entry.title)
    assert.equal(new Set(byLead).size, byLead.length)
    assert.ok(byLead.every((title) => title.startsWith('Same topic · IT — ')))

    // same topic, countries AND lead: only the id can separate them
    const identical = model.clusters.map((cluster) => ({...cluster, leads: [{node: 0, weight: 1}], topCountries: [{key: 'IT', count: 1, share: 1}]}))
    const byId = [...clusterTitles(identical, nodes, () => 'Same topic').values()].map((entry) => entry.title)
    assert.equal(new Set(byId).size, byId.length)
    assert.ok(byId.every((title) => /\(#\d+\)$/.test(title)))
})

import {clusterArcs, clusterColorHex, INTER_CLUSTER_LINK_STRENGTH, INTRA_CLUSTER_LINK_STRENGTH, layoutInputs, styleForceGraph} from '../src/modules/search/collaboration/clusterGraph.ts'
import {layoutForceGraph} from '../src/common/deckgl/forceLayout.ts'

test('graph inputs: links inside a cluster pull harder than links between clusters', () => {
    const model = buildClusterModel(network)
    const {links} = layoutInputs(network, model)
    assert.equal(links.length, edges.length)
    const strengths = new Set(links.map((link) => link.strength))
    assert.deepEqual(strengths, new Set([INTRA_CLUSTER_LINK_STRENGTH, INTER_CLUSTER_LINK_STRENGTH]))
})

test('styling: bridge edges are emphasised, the strongest hinges get ring and label, the unselected clusters are dimmed', () => {
    const model = buildClusterModel(network)
    const inputs = layoutInputs(network, model)
    const layout = layoutForceGraph(inputs.nodes, inputs.links)
    const selected = model.clusterOfNode.get(0)!
    const styled = styleForceGraph({network, model, layout, selectedCluster: selected})

    assert.equal(styled.blobs.length, 2)
    assert.equal(styled.blobs.filter((blob) => blob.selected).length, 1)
    const h = styled.nodes.find((node) => node.id === 'h')!
    assert.equal(h.ring, true)
    assert.equal(h.label, 'H')
    assert.equal(styled.nodes.filter((node) => node.ring).length, model.hinges.length)
    const otherCluster = model.clusterOfNode.get(4)!
    if (otherCluster !== selected) assert.equal(styled.nodes.find((node) => node.id === 'y2')!.dimmed, true)
    assert.equal(styled.nodes.find((node) => node.id === 'x2')!.dimmed, false)
    const bridges = styled.edges.filter((edge) => edge.emphasis === 'bridge')
    assert.ok(bridges.length >= 2)
    assert.equal(styled.edges.length, edges.length)
    // no selection: nothing dimmed
    assert.ok(styleForceGraph({network, model, layout, selectedCluster: null}).nodes.every((node) => !node.dimmed))
})

test('cluster colours are deterministic and distinct; arcs are coloured by cluster inside it and skip unlocated ends', () => {
    assert.equal(clusterColorHex('1'), clusterColorHex('1'))
    assert.notEqual(clusterColorHex('1'), clusterColorHex('2'))
    assert.match(clusterColorHex('3'), /^#[0-9a-f]{6}$/)
    const model = buildClusterModel(network)
    const moved = {...network, nodes: network.nodes.map((node, index) => (index === 3 ? {...node, lat: null, lng: null} : node))}
    const arcs = clusterArcs(moved, model)
    assert.equal(arcs.links.length, edges.filter((edge) => edge.a !== 3 && edge.b !== 3).length, 'edges touching the unlocated node are skipped')
    assert.ok(arcs.nodes.every((node) => node.id !== 'x3'))
})

import {clusterSelection, selectedClusterPoints} from '../src/modules/search/collaboration/clusterGraph.ts'
import {fitGeoBounds} from '../src/common/deckgl/mapFit.ts'

test('one selection rule: members emphasised, other clusters dimmed, bridges and unrelated links told apart', () => {
    const model = buildClusterModel(network)
    const selected = model.clusterOfNode.get(0)!
    const {nodeState, edgeState} = clusterSelection(model, selected)
    assert.equal(nodeState(0), 'emphasized')
    const outsider = [...model.clusterOfNode].find(([, cluster]) => cluster !== selected)![0]
    assert.equal(nodeState(outsider), 'dimmed')
    // inside the selected cluster / crossing out of it / entirely elsewhere
    assert.equal(edgeState(0, 1), 'emphasized')
    const bridge = edges.find((edge) => (model.clusterOfNode.get(edge.a) === selected) !== (model.clusterOfNode.get(edge.b) === selected))!
    assert.equal(edgeState(bridge.a, bridge.b), 'normal')
    const elsewhere = edges.find((edge) => model.clusterOfNode.get(edge.a) !== selected && model.clusterOfNode.get(edge.b) !== selected)!
    assert.equal(edgeState(elsewhere.a, elsewhere.b), 'dimmed')
    // no selection: nothing is emphasised or dimmed
    const none = clusterSelection(model, null)
    assert.equal(none.nodeState(0), 'normal')
    assert.equal(none.edgeState(0, 1), 'normal')
})

test('the map and the graph style the same selection the same way', () => {
    const model = buildClusterModel(network)
    const selected = model.clusterOfNode.get(4)!
    const inputs = layoutInputs(network, model)
    const layout = layoutForceGraph(inputs.nodes, inputs.links)
    const graph = styleForceGraph({network, model, layout, selectedCluster: selected})
    const arcs = clusterArcs(network, model, selected)
    for (const node of arcs.nodes) {
        assert.equal(node.dimmed, graph.nodes.find((entry) => entry.id === node.id)!.dimmed, node.id)
        assert.equal(node.emphasized, model.clusterOfNode.get(nodes.findIndex((entry) => entry.id === node.id)) === selected)
    }
    for (const link of arcs.links) assert.equal(link.dimmed, graph.edges.find((entry) => entry.id === link.id)!.dimmed, link.id)
    assert.ok(arcs.links.some((link) => link.emphasized))
    assert.ok(arcs.links.some((link) => link.dimmed))
    // the selection changes the arcs: a different selection is a different picture
    const other = clusterArcs(network, model, model.clusterOfNode.get(0)!)
    assert.notDeepEqual(other.links.map((link) => link.dimmed), arcs.links.map((link) => link.dimmed))
    // and no selection leaves every arc plain
    assert.ok(clusterArcs(network, model, null).links.every((link) => !link.dimmed && !link.emphasized))
})

test('the extent of the selected cluster: located members only; none when nobody is located', () => {
    const model = buildClusterModel(network)
    const selected = model.clusterOfNode.get(0)!
    const located = network.nodes.map((node, index) => ({...node, lat: index < 4 ? 40 + index : null, lng: index < 4 ? 10 + index : null}))
    const points = selectedClusterPoints({...network, nodes: located}, model, selected)
    assert.equal(points.length, [...model.clusterOfNode].filter(([node, cluster]) => cluster === selected && node < 4).length)
    const nobody = network.nodes.map((node) => ({...node, lat: null, lng: null}))
    assert.deepEqual(selectedClusterPoints({...network, nodes: nobody}, model, selected), [])
    assert.deepEqual(selectedClusterPoints(network, model, null), [])
})

test('fitting the camera: centred on the extent, zoomed to fit, clamped, one place is a fixed close zoom', () => {
    assert.equal(fitGeoBounds([]), null)
    const single = fitGeoBounds([[10, 50]])!
    assert.deepEqual([single.longitude, single.latitude], [10, 50])
    assert.equal(single.zoom, 7)
    const europe = fitGeoBounds([[-5, 36], [25, 60]])!
    assert.equal(europe.longitude, 10)
    assert.equal(europe.latitude, 48)
    const city = fitGeoBounds([[11.0, 48.0], [11.4, 48.3]])!
    assert.ok(city.zoom > europe.zoom, 'a smaller area zooms in further')
    assert.ok(fitGeoBounds([[-170, 0], [170, 0]])!.zoom >= 2, 'never zooms out past the floor')
    assert.ok(fitGeoBounds([[11, 48], [11.0001, 48.0001]])!.zoom <= 9, 'never zooms in past the ceiling')
})
