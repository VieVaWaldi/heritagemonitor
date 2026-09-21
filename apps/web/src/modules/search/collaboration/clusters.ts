// CLUSTER-FIRST VIEW OF THE QUERY NETWORK
//
// Purpose: a user searches a topic to learn which research COMMUNITIES exist
// around it, who is in each, and who bridges them. A graph of single
// institutions nobody can click does not answer that, so everything here works
// on the level of clusters: the Louvain communities of the (capped) network,
// ranked by how much collaboration they hold, with the organisations that sit
// between them (hinges) and the projects that span them (bridge projects).
//
// Pure and deterministic — same network, same clusters, same ids — so
// `sel=<clusterId>` in a URL means the same cluster for identical parameters.
// Relative imports with extensions: unit tested by Node's own runner (see
// test/clusters.test.ts).
import type {NetworkNode, QueryNetworkResponse} from '@heritagemonitor/shared'
import {detectCommunities} from '../../../common/deckgl/communities.ts'

// --- tuning (one place) -------------------------------------------------------

/** A hinge organisation needs at least this many collaborations in the network... */
export const HINGE_MIN_DEGREE = 3
/** ...and touches at least this many clusters... */
export const HINGE_MIN_CLUSTERS = 2
/** ...and a participation coefficient of at least this (0 = all links in one cluster, near 1 = spread evenly). */
export const HINGE_MIN_PARTICIPATION = 0.3
/** Lead organisations shown per cluster. */
export const LEAD_COUNT = 5
/** Entries in each "top funders / topics / countries" list. */
export const TOP_SHARE_COUNT = 5
/** Hinge organisations that get a ring and a label on the graph. */
export const LABELLED_HINGES = 5

// --- shapes ------------------------------------------------------------------

export interface Share {
    key: string
    count: number
    /** count / total of what was counted, 0..1. */
    share: number
}

export interface Lead {
    /** Node index. */
    node: number
    /** Shared projects with the cluster's other members (weighted degree inside it). */
    weight: number
}

export interface Cluster {
    /** '1', '2', ... in ranking order — the value of `sel`. */
    id: string
    /** Node indexes, most connected inside the cluster first. */
    members: number[]
    /** Collaborations between two members. */
    internalEdges: number
    /** Shared projects summed over those collaborations: the ranking key. */
    strength: number
    /** Shared projects on collaborations that leave the cluster. */
    externalWeight: number
    /** Project indexes assigned to this cluster (the majority of their organisations are members), in ranking order. */
    projects: number[]
    /** Summed budget of those projects, EUR (a project counts once, whole). */
    funding: number
    /** Years covered by those projects, or null. */
    years: [number, number] | null
    topFunders: Share[]
    topTopics: Share[]
    topCountries: Share[]
    leads: Lead[]
    /** Hinge organisations that are members of this cluster. */
    hingeNodes: number[]
}

export interface Hinge {
    node: number
    participation: number
    /** Collaborations of the node. */
    degree: number
    /** Its clusters with the shared projects it has into each, strongest first. */
    clusters: Array<{cluster: string; weight: number}>
}

export interface ProjectPlacement {
    /** Index into `network.projects` (= ranking position among the scanned projects). */
    project: number
    /** The cluster holding the majority of its organisations. */
    cluster: string
    /** Every cluster it touches, the majority first. */
    span: string[]
    isBridge: boolean
    organisations: number
}

export interface ClusterModel {
    clusters: Cluster[]
    /** Node index -> cluster id. */
    clusterOfNode: Map<number, string>
    hinges: Hinge[]
    placements: ProjectPlacement[]
    /** Bridge projects only, ranked: clusters spanned, then organisations, then ranking position. */
    hingeProjects: ProjectPlacement[]
}

const EMPTY_MODEL: ClusterModel = {clusters: [], clusterOfNode: new Map(), hinges: [], placements: [], hingeProjects: []}

function topShares(counts: Map<string, number>, total: number, limit = TOP_SHARE_COUNT): Share[] {
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
        .slice(0, limit)
        .map(([key, count]) => ({key, count, share: total > 0 ? count / total : 0}))
}

/** 1 - sum over clusters of (k_ic / k_i)^2, from the node's weights per cluster. 0 when it has no links. */
export function participationCoefficient(weightsByCluster: readonly number[]): number {
    const total = weightsByCluster.reduce((sum, weight) => sum + weight, 0)
    if (total <= 0) return 0
    return 1 - weightsByCluster.reduce((sum, weight) => sum + (weight / total) ** 2, 0)
}

// --- the model ----------------------------------------------------------------

export function buildClusterModel(network: QueryNetworkResponse): ClusterModel {
    const {nodes, edges} = network
    if (edges.length === 0 || nodes.length === 0) return EMPTY_MODEL

    // 1. Communities: deterministic (seeded Louvain over the weighted edges).
    const communities = detectCommunities(edges.map((edge) => ({a: nodes[edge.a].id, b: nodes[edge.b].id, weight: edge.w})))
    const communityOfNode = nodes.map((node) => communities.get(node.id))

    // 2. Group, measure, rank. Strength = shared projects inside the cluster;
    //    ties by size, then by the smallest member id so the order never
    //    depends on iteration order.
    const groups = new Map<number, number[]>()
    communityOfNode.forEach((community, node) => {
        if (community === undefined) return
        groups.set(community, [...(groups.get(community) ?? []), node])
    })
    const measured = [...groups.values()].map((members) => {
        const inside = new Set(members)
        let internalEdges = 0
        let strength = 0
        let externalWeight = 0
        for (const edge of edges) {
            const aIn = inside.has(edge.a)
            const bIn = inside.has(edge.b)
            if (aIn && bIn) {
                internalEdges += 1
                strength += edge.w
            } else if (aIn || bIn) externalWeight += edge.w
        }
        const key = members.map((node) => nodes[node].id).sort()[0]
        return {members, internalEdges, strength, externalWeight, key}
    })
    measured.sort((a, b) => b.strength - a.strength || b.members.length - a.members.length || (a.key < b.key ? -1 : 1))

    const clusterOfNode = new Map<number, string>()
    measured.forEach((group, index) => group.members.forEach((node) => clusterOfNode.set(node, String(index + 1))))

    // 3. Per node: collaborations, and the weight it has into each cluster.
    const degree = new Array<number>(nodes.length).fill(0)
    const weightInto = nodes.map(() => new Map<string, number>())
    const insideWeight = new Array<number>(nodes.length).fill(0)
    for (const edge of edges) {
        degree[edge.a] += 1
        degree[edge.b] += 1
        const ca = clusterOfNode.get(edge.a)
        const cb = clusterOfNode.get(edge.b)
        if (ca === undefined || cb === undefined) continue
        weightInto[edge.a].set(cb, (weightInto[edge.a].get(cb) ?? 0) + edge.w)
        weightInto[edge.b].set(ca, (weightInto[edge.b].get(ca) ?? 0) + edge.w)
        if (ca === cb) {
            insideWeight[edge.a] += edge.w
            insideWeight[edge.b] += edge.w
        }
    }

    // 4. Hinge organisations.
    const hinges: Hinge[] = []
    nodes.forEach((_node, node) => {
        const weights = weightInto[node]
        const participation = participationCoefficient([...weights.values()])
        if (degree[node] < HINGE_MIN_DEGREE || weights.size < HINGE_MIN_CLUSTERS || participation < HINGE_MIN_PARTICIPATION) return
        hinges.push({
            node,
            participation,
            degree: degree[node],
            clusters: [...weights.entries()].map(([cluster, weight]) => ({cluster, weight})).sort((a, b) => b.weight - a.weight || Number(a.cluster) - Number(b.cluster)),
        })
    })
    hinges.sort((a, b) => b.participation - a.participation || b.degree - a.degree || (nodes[a.node].id < nodes[b.node].id ? -1 : 1))

    // 5. Projects: majority cluster, and the clusters spanned.
    const placements: ProjectPlacement[] = []
    network.projects.orgs.forEach((organisations, project) => {
        const counts = new Map<string, number>()
        for (const node of organisations) {
            const cluster = clusterOfNode.get(node)
            if (cluster !== undefined) counts.set(cluster, (counts.get(cluster) ?? 0) + 1)
        }
        if (counts.size === 0) return
        const span = [...counts.entries()].sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0])).map(([cluster]) => cluster)
        placements.push({project, cluster: span[0], span, isBridge: span.length >= 2, organisations: organisations.length})
    })
    const hingeProjects = placements
        .filter((placement) => placement.isBridge)
        .sort((a, b) => b.span.length - a.span.length || b.organisations - a.organisations || a.project - b.project)

    // 6. Per-cluster facts.
    const hingeByCluster = new Map<string, number[]>()
    for (const hinge of hinges) {
        const cluster = clusterOfNode.get(hinge.node)
        if (cluster !== undefined) hingeByCluster.set(cluster, [...(hingeByCluster.get(cluster) ?? []), hinge.node])
    }
    const clusters: Cluster[] = measured.map((group, index) => {
        const id = String(index + 1)
        const members = [...group.members].sort((a, b) => insideWeight[b] - insideWeight[a] || (nodes[a].name < nodes[b].name ? -1 : 1))

        const assigned = placements.filter((placement) => placement.cluster === id).map((placement) => placement.project)
        let funding = 0
        let yearMin = Infinity
        let yearMax = -Infinity
        const funders = new Map<string, number>()
        const topics = new Map<string, number>()
        let withFunder = 0
        let withTopic = 0
        for (const project of assigned) {
            funding += network.projects.amount[project] ?? 0
            const year = network.projects.year[project]
            if (year > 0) {
                yearMin = Math.min(yearMin, year)
                yearMax = Math.max(yearMax, year)
            }
            const funder = network.projects.funder[project]
            if (funder >= 0) {
                funders.set(network.funders[funder], (funders.get(network.funders[funder]) ?? 0) + 1)
                withFunder += 1
            }
            const topic = network.projects.topic[project]
            if (topic >= 0) {
                topics.set(network.topics[topic], (topics.get(network.topics[topic]) ?? 0) + 1)
                withTopic += 1
            }
        }
        const countries = new Map<string, number>()
        let withCountry = 0
        for (const node of members) {
            const country = nodes[node].countryCode
            if (country) {
                countries.set(country, (countries.get(country) ?? 0) + 1)
                withCountry += 1
            }
        }

        return {
            id,
            members,
            internalEdges: group.internalEdges,
            strength: group.strength,
            externalWeight: group.externalWeight,
            projects: assigned,
            funding,
            years: Number.isFinite(yearMin) ? [yearMin, yearMax] : null,
            topFunders: topShares(funders, withFunder),
            topTopics: topShares(topics, withTopic),
            topCountries: topShares(countries, withCountry),
            leads: members.slice(0, LEAD_COUNT).map((node) => ({node, weight: insideWeight[node]})),
            hingeNodes: hingeByCluster.get(id) ?? [],
        }
    })

    return {clusters, clusterOfNode, hinges, placements, hingeProjects}
}

export function findCluster(model: ClusterModel, id: string | null): Cluster | null {
    return id ? (model.clusters.find((cluster) => cluster.id === id) ?? null) : null
}

// --- titles -------------------------------------------------------------------

export interface ClusterTitle {
    title: string
    subtitle: string
}

/**
 * Titles that say what a cluster is about and where: its top topic (most
 * projects) plus its lead countries — 'Archaeology and Cultural Heritage ·
 * Italy, UK' — and 'led by <top organisation>' underneath. Without topic data:
 * 'Cluster 3: <top organisation> and partners'. Two clusters that come out
 * with the same title are told apart by their lead, then by their id.
 */
export function clusterTitles(
    clusters: readonly Cluster[],
    nodes: readonly Pick<NetworkNode, 'name'>[],
    topicName: (topicId: string) => string | null,
): Map<string, ClusterTitle> {
    const lead = (cluster: Cluster) => nodes[cluster.leads[0]?.node ?? cluster.members[0]]?.name ?? `cluster ${cluster.id}`

    const base = clusters.map((cluster) => {
        const topic = cluster.topTopics[0] ? topicName(cluster.topTopics[0].key) : null
        const countries = cluster.topCountries.slice(0, 2).map((share) => share.key).join(', ')
        const title = topic ? (countries ? `${topic} · ${countries}` : topic) : `Cluster ${cluster.id}: ${lead(cluster)} and partners`
        return {cluster, title}
    })

    const occurrences = new Map<string, number>()
    for (const {title} of base) occurrences.set(title, (occurrences.get(title) ?? 0) + 1)
    const withLead = base.map(({cluster, title}) => ((occurrences.get(title) ?? 0) > 1 ? {cluster, title: `${title} — ${lead(cluster)}`} : {cluster, title}))
    const still = new Map<string, number>()
    for (const {title} of withLead) still.set(title, (still.get(title) ?? 0) + 1)

    return new Map(
        withLead.map(({cluster, title}) => [
            cluster.id,
            {title: (still.get(title) ?? 0) > 1 ? `${title} (#${cluster.id})` : title, subtitle: `led by ${lead(cluster)}`},
        ]),
    )
}

/** The other clusters a hinge organisation connects its own cluster to. */
export function hingeOtherClusters(hinge: Hinge, ownCluster: string | undefined): Array<{cluster: string; weight: number}> {
    return hinge.clusters.filter((entry) => entry.cluster !== ownCluster)
}
