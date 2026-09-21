import {projectSearchResponseSchema, type QueryNetworkResponse} from '@heritagemonitor/shared'
import type {PageContextLazy, PageContextSection} from '@/common/llmchat/pageContext'
import {projectsOf, relatedLazyContext, type RelatedListSpec} from '../entity/relatedContext'
import {hingeOtherClusters, type Cluster, type ClusterModel} from './clusters'
import {basisNote, projectsByIdsPath} from './queryNetworkAdapter'

// What Lucy is told about the query network (the cluster view). Kept out of
// the panel (apps/web/RULES.md #7) and out of common/llmchat.

/** Cluster rows listed in the context — the strongest ones; the rest are on the page. */
const CONTEXT_CLUSTER_ROWS = 20
/** Projects fetched lazily per list. */
const LAZY_PROJECTS = 12

type Titles = ReadonlyMap<string, {title: string; subtitle: string}>

export function clusterChatRow(cluster: Cluster, titles: Titles, network: QueryNetworkResponse): string {
    const lead = network.nodes[cluster.leads[0]?.node ?? cluster.members[0]]?.name ?? 'n/a'
    return `- Cluster ${cluster.id}: ${titles.get(cluster.id)?.title ?? `Cluster ${cluster.id}`} (${cluster.members.length} organisations, ${cluster.projects.length} projects, led by ${lead})`
}

export function queryNetworkStateSection(options: {
    query: string
    corpusName: string
    network: QueryNetworkResponse
    model: ClusterModel
    titles: Titles
    maxEdges: number
    layer: string
    urlParams: string
}): PageContextSection {
    const {query, corpusName, network, model, titles, maxEdges, layer, urlParams} = options
    const {meta} = network
    const listed = model.clusters.slice(0, CONTEXT_CLUSTER_ROWS)

    return {
        heading: [
            `The query network page finds the research COMMUNITIES (clusters) around ${query ? `"${query}"` : 'the current filters (no search text)'}: organisations that collaborated on projects are linked, clusters are the groups that work mostly with each other, ranked by the shared projects inside them. Hinge organisations and bridge projects connect clusters. sel = the selected cluster's number.`,
            `Corpus: ${corpusName}. At most ${maxEdges} strongest collaborations are used (maxEdges = ${maxEdges}); the cap keeps those with the most shared projects and, among equals, those in the best-ranked projects, so the clusters depend on the search and on the cap. Picture: ${layer === 'arcs' ? 'arcs on a map (organisations with coordinates only)' : 'force graph coloured by cluster'}.`,
            basisNote(meta),
            `${model.clusters.length} cluster${model.clusters.length === 1 ? '' : 's'} from ${network.edges.length} of ${meta.edgesFound.toLocaleString('en-US')} collaborations${meta.capped ? ' (the cap dropped the weaker ones)' : ''}; ${model.hinges.length} bridge organisation${model.hinges.length === 1 ? '' : 's'} and ${model.hingeProjects.length} bridge project${model.hingeProjects.length === 1 ? '' : 's'}; ${meta.withoutGeo} organisations shown have no location.`,
            meta.mode === 'fuzzy' ? 'The text was too rare as typed, so close matches were used.' : '',
            `Active URL parameters: ${urlParams}.`,
            `The strongest clusters (${listed.length} of ${model.clusters.length}):`,
        ]
            .filter(Boolean)
            .join(' '),
        rows: listed.map((cluster) => clusterChatRow(cluster, titles, network)),
    }
}

/** The facts the Overview tab shows for the selected cluster, and its bridges. */
export function selectedClusterSection(options: {cluster: Cluster; network: QueryNetworkResponse; model: ClusterModel; titles: Titles; topicLabel: (id: string) => string}): PageContextSection {
    const {cluster, network, model, titles, topicLabel} = options
    const name = (index: number) => network.nodes[index]?.name ?? '?'
    const shares = (list: Cluster['topFunders'], label: (key: string) => string = (key) => key) =>
        list.length ? list.map((share) => `${label(share.key)} (${share.count})`).join(', ') : 'none recorded'

    const bridges = cluster.hingeNodes.map((nodeIndex) => {
        const hinge = model.hinges.find((entry) => entry.node === nodeIndex)!
        const others = hingeOtherClusters(hinge, cluster.id).map((entry) => `${entry.cluster}. ${titles.get(entry.cluster)?.title ?? `Cluster ${entry.cluster}`}`)
        return `${name(nodeIndex)} (connects to ${others.join('; ') || 'no other cluster'})`
    })
    const spanning = model.hingeProjects.filter((placement) => placement.span.includes(cluster.id)).length

    const lines = [
        `Title: ${titles.get(cluster.id)?.title} — ${titles.get(cluster.id)?.subtitle}`,
        `Size: ${cluster.members.length} organisations, ${cluster.internalEdges} collaborations (${cluster.strength} shared projects), ${cluster.projects.length} projects${cluster.years ? `, ${cluster.years[0]}-${cluster.years[1]}` : ''}`,
        `Budget of its projects: ${cluster.funding > 0 ? `about ${Math.round(cluster.funding).toLocaleString('en-US')} EUR` : 'none recorded'} (approximate: a project counts once, whole; only some projects report a budget)`,
        `Top funders: ${shares(cluster.topFunders)}`,
        `Top countries: ${shares(cluster.topCountries)}`,
        `Top topics: ${shares(cluster.topTopics, topicLabel)}`,
        `Lead organisations: ${cluster.leads.map((lead) => `${name(lead.node)} (${lead.weight} shared projects inside)`).join('; ')}`,
        `Bridge organisations: ${bridges.length ? bridges.join('; ') : 'none'}`,
        `Projects spanning this cluster and another: ${spanning}`,
    ]
    return {
        heading: `The cluster selected on the page — ${cluster.id}. ${titles.get(cluster.id)?.title}:`,
        rows: [lines.join('\n')],
        maxCharsPerRow: 2_500,
    }
}

/**
 * The selected cluster's projects and the widest bridge projects, fetched when
 * a message is sent (see resolvePageContext) — their links are the sources
 * Lucy may fetch, through the same direct-host rule as everywhere. A hidden
 * tab's list is skipped.
 */
export function queryNetworkLazyContext(options: {
    cluster: Cluster | null
    network: QueryNetworkResponse
    model: ClusterModel
    hiddenTabs: readonly string[]
}): PageContextLazy {
    const {cluster, network, model, hiddenTabs} = options
    const idOf = (project: number) => network.projects.ids[project]
    const lists: RelatedListSpec[] = [
        ...(cluster && cluster.projects.length > 0
            ? [projectsOf(`Projects of cluster ${cluster.id}`, projectsByIdsPath(cluster.projects.slice(0, LAZY_PROJECTS).map(idOf)), projectSearchResponseSchema, 'projects')]
            : []),
        ...(model.hingeProjects.length > 0
            ? [projectsOf('Bridge projects across clusters', projectsByIdsPath(model.hingeProjects.slice(0, LAZY_PROJECTS).map((placement) => idOf(placement.project))), projectSearchResponseSchema, 'bridges')]
            : []),
    ]
    return relatedLazyContext('query network cluster view', lists, hiddenTabs)
}
