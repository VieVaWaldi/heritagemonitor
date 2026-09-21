import type {QueryNetworkResponse} from '@heritagemonitor/shared'
// Relative, with extensions where a value is imported (unit tested by Node's
// own runner); types are erased.
import {communityColor} from '../../../common/deckgl/communities.ts'
import {blobOf, nodeRadius, type ForceInputLink, type ForceInputNode, type ForceLayoutResult} from '../../../common/deckgl/forceLayout.ts'
import type {ArcNetworkLink, ArcNetworkNode} from '../../../common/deckgl/layers/arcNetworkLayer.ts'
import type {ForceGraphBlob, ForceGraphEdge, ForceGraphNode} from '../../../common/deckgl/ForceGraphCanvas.tsx'
import {LABELLED_HINGES, type ClusterModel} from './clusters.ts'

// From a cluster model to what the two pictures draw. Pure: the layout runs
// once per network (it is the expensive part), the styling — which cluster is
// selected, who is dimmed — runs on every selection change and only reads.

/** Links inside a cluster pull hard, links between clusters barely: the groups hold together and the hinges sit between them. */
export const INTRA_CLUSTER_LINK_STRENGTH = 0.3
export const INTER_CLUSTER_LINK_STRENGTH = 0.04

// --- the selected cluster: ONE definition of what is emphasised and dimmed --------
//
// The force graph and the map (arcs) both call this, so selecting a cluster
// looks the same in both pictures. (The map used to ignore the selection: its
// layer never received it.)

export type SelectionState = 'emphasized' | 'normal' | 'dimmed'

export function clusterSelection(model: ClusterModel, selectedCluster: string | null) {
    /** A member of the selected cluster is emphasised, everything else recedes; with no selection all are normal. */
    const nodeState = (node: number): SelectionState => {
        if (selectedCluster === null) return 'normal'
        return model.clusterOfNode.get(node) === selectedCluster ? 'emphasized' : 'dimmed'
    }
    /**
     * A collaboration inside the selected cluster is emphasised; one that
     * leaves it (a bridge, which is the interesting part) stays normal; one
     * that has nothing to do with it recedes.
     */
    const edgeState = (a: number, b: number): SelectionState => {
        if (selectedCluster === null) return 'normal'
        const inA = model.clusterOfNode.get(a) === selectedCluster
        const inB = model.clusterOfNode.get(b) === selectedCluster
        return inA && inB ? 'emphasized' : inA || inB ? 'normal' : 'dimmed'
    }
    return {nodeState, edgeState}
}

/** Where the selected cluster's organisations are (`[longitude, latitude]`): only the ones with coordinates. */
export function selectedClusterPoints(network: QueryNetworkResponse, model: ClusterModel, selectedCluster: string | null): Array<[number, number]> {
    if (selectedCluster === null) return []
    return network.nodes.flatMap((node, index) =>
        model.clusterOfNode.get(index) === selectedCluster && node.lat !== null && node.lng !== null ? [[node.lng, node.lat] as [number, number]] : [],
    )
}

export const clusterColorRgb = (clusterId: string): [number, number, number] => communityColor(Number(clusterId))

export const clusterColorHex = (clusterId: string): string => {
    const [r, g, b] = clusterColorRgb(clusterId)
    return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

export function layoutInputs(network: QueryNetworkResponse, model: ClusterModel): {nodes: ForceInputNode[]; links: ForceInputLink[]} {
    return {
        nodes: network.nodes.map((node) => ({id: node.id})),
        links: network.edges.map((edge) => ({
            source: network.nodes[edge.a].id,
            target: network.nodes[edge.b].id,
            strength: model.clusterOfNode.get(edge.a) === model.clusterOfNode.get(edge.b) ? INTRA_CLUSTER_LINK_STRENGTH : INTER_CLUSTER_LINK_STRENGTH,
        })),
    }
}

export function styleForceGraph(options: {
    network: QueryNetworkResponse
    model: ClusterModel
    layout: ForceLayoutResult
    selectedCluster: string | null
}): {nodes: ForceGraphNode[]; edges: ForceGraphEdge[]; blobs: ForceGraphBlob[]} {
    const {network, model, layout, selectedCluster} = options
    const labelled = new Set(model.hinges.slice(0, LABELLED_HINGES).map((hinge) => hinge.node))
    const {nodeState, edgeState} = clusterSelection(model, selectedCluster)

    const nodes: ForceGraphNode[] = network.nodes.map((node, index) => {
        const cluster = model.clusterOfNode.get(index)
        const position = layout.positions.get(node.id) ?? {x: 0, y: 0}
        return {
            id: node.id,
            x: position.x,
            y: position.y,
            radius: nodeRadius(layout.degree.get(node.id) ?? 0),
            color: cluster ? clusterColorRgb(cluster) : [128, 128, 128],
            ring: labelled.has(index),
            label: labelled.has(index) ? node.name : undefined,
            dimmed: nodeState(index) === 'dimmed',
        }
    })

    const edges: ForceGraphEdge[] = network.edges.map((edge) => {
        const a = network.nodes[edge.a]
        const b = network.nodes[edge.b]
        const ca = model.clusterOfNode.get(edge.a)
        const cb = model.clusterOfNode.get(edge.b)
        const pa = layout.positions.get(a.id) ?? {x: 0, y: 0}
        const pb = layout.positions.get(b.id) ?? {x: 0, y: 0}
        return {
            id: `${a.id}:${b.id}`,
            source: [pa.x, pa.y],
            target: [pb.x, pb.y],
            weight: edge.w,
            emphasis: ca !== cb ? 'bridge' : undefined,
            dimmed: edgeState(edge.a, edge.b) === 'dimmed',
        }
    })

    const blobs: ForceGraphBlob[] = model.clusters.flatMap((cluster) => {
        const blob = blobOf(layout.positions, cluster.members.map((member) => network.nodes[member].id))
        return blob ? [{id: cluster.id, ...blob, color: clusterColorRgb(cluster.id), selected: cluster.id === selectedCluster}] : []
    })

    return {nodes, edges, blobs}
}

/**
 * The same edges as arcs on a map, coloured by cluster, with the selected
 * cluster emphasised and the rest dimmed (see clusterSelection). Bridges keep
 * the layer's own two colours.
 */
export function clusterArcs(network: QueryNetworkResponse, model: ClusterModel, selectedCluster: string | null = null): {links: ArcNetworkLink[]; nodes: ArcNetworkNode[]} {
    const {nodeState, edgeState} = clusterSelection(model, selectedCluster)
    const located = (index: number) => network.nodes[index].lat !== null && network.nodes[index].lng !== null
    const position = (index: number): [number, number] => [network.nodes[index].lng as number, network.nodes[index].lat as number]

    const links: ArcNetworkLink[] = network.edges.flatMap((edge) => {
        if (!located(edge.a) || !located(edge.b)) return []
        const ca = model.clusterOfNode.get(edge.a)
        const cb = model.clusterOfNode.get(edge.b)
        return [
            {
                id: `${network.nodes[edge.a].id}:${network.nodes[edge.b].id}`,
                source: position(edge.a),
                target: position(edge.b),
                weight: edge.w,
                color: ca !== undefined && ca === cb ? clusterColorRgb(ca) : undefined,
                dimmed: edgeState(edge.a, edge.b) === 'dimmed',
                emphasized: edgeState(edge.a, edge.b) === 'emphasized',
            },
        ]
    })
    const nodes: ArcNetworkNode[] = network.nodes.flatMap((node, index) => {
        if (!located(index)) return []
        const cluster = model.clusterOfNode.get(index)
        return [{id: node.id, geolocation: position(index), linkCount: 1, colorHex: cluster ? clusterColorHex(cluster) : undefined, dimmed: nodeState(index) === 'dimmed', emphasized: nodeState(index) === 'emphasized'}]
    })
    return {links, nodes}
}
