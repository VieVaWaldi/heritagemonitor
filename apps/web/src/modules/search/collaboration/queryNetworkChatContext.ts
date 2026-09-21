import {projectSearchResponseSchema, type QueryNetworkResponse} from '@heritagemonitor/shared'
import type {PageContextLazy, PageContextSection} from '@/common/llmchat/pageContext'
import {projectsOf, relatedLazyContext, type RelatedListSpec} from '../entity/relatedContext'
import {edgeChatRow, edgeProjectsPath, basisNote, matchingProjectsPath, type QueryEdge} from './queryNetworkAdapter'

// What Lucy is told about the query network. Kept out of the panel
// (apps/web/RULES.md #7) and out of common/llmchat.

/** Edge rows listed in the context — the strongest ones; the rest are on the page. */
const CONTEXT_EDGE_ROWS = 20

export function queryNetworkStateSection(options: {
    query: string
    corpusName: string
    network: QueryNetworkResponse
    edges: QueryEdge[]
    maxEdges: number
    layer: string
    urlParams: string
}): PageContextSection {
    const {query, corpusName, network, edges, maxEdges, layer, urlParams} = options
    const {meta} = network
    const listed = edges.slice(0, CONTEXT_EDGE_ROWS)

    return {
        heading: [
            `The query network page shows who collaborates within the projects matching ${query ? `"${query}"` : 'the current filters (no search text)'}: two organisations are linked when they shared a project, and a link is stronger the more projects they share.`,
            `Corpus: ${corpusName}. Showing the ${maxEdges} strongest collaborations at most (maxEdges = ${maxEdges}); the cap keeps the collaborations with the most shared projects and, among equals, those in the best-ranked projects. Layout: ${layer === 'arcs' ? 'arcs on a map (only organisations with coordinates)' : 'force graph coloured by community'}.`,
            basisNote(meta),
            `${edges.length} collaboration${edges.length === 1 ? '' : 's'} shown of ${meta.edgesFound.toLocaleString('en-US')} found${meta.capped ? ' (the cap dropped the weaker ones)' : ''}; ${meta.withoutGeo} of the organisations shown have no location.`,
            meta.mode === 'fuzzy' ? 'The text was too rare as typed, so close matches were used.' : '',
            `Active URL parameters: ${urlParams}.`,
            `The strongest collaborations (${listed.length} of ${edges.length}):`,
        ]
            .filter(Boolean)
            .join(' '),
        rows: listed.map(edgeChatRow),
    }
}

/**
 * The shared projects of the selected collaboration and the matching projects,
 * fetched when a message is sent (see resolvePageContext) — their links are
 * the sources Lucy may fetch, through the same direct-host rule as everywhere.
 */
export function queryNetworkLazyContext(options: {edge: QueryEdge | null; filterQuery: string}): PageContextLazy {
    const {edge, filterQuery} = options
    const lists: RelatedListSpec[] = [
        ...(edge
            ? [projectsOf(`Projects that link ${edge.a.name} and ${edge.b.name}`, edgeProjectsPath(edge, 1, filterQuery), projectSearchResponseSchema, 'detail')]
            : []),
        projectsOf('Projects matching the current search', matchingProjectsPath(filterQuery, 1), projectSearchResponseSchema),
    ]
    return relatedLazyContext('query network', lists)
}
