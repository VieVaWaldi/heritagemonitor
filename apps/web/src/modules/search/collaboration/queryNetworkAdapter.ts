import type {QueryNetworkResponse} from '@heritagemonitor/shared'
// Relative, with extensions where a value is imported: unit tested by Node's
// own runner (test/queryNetwork.test.ts). Types are erased.
import {SEARCH_PARAM} from '../../../common/url/codecs.ts'
import {relatedParams} from '../entity/relatedParams.ts'

// ADAPTER: the requests of the query network page. Pure functions only.

/**
 * The query string of the network request AND of the project lists inside it:
 * q, the corpus and the project filters — exactly what the
 * `collaboration:queryNetwork` relation carries (entity/relatedParams).
 */
export function queryNetworkFilterQuery(params: URLSearchParams): string {
    return relatedParams('collaboration:queryNetwork', params).toString()
}

export const queryNetworkPath = (filterQuery: string, maxEdges: number) => {
    const query = new URLSearchParams(filterQuery)
    query.set(SEARCH_PARAM.maxEdges, String(maxEdges))
    return `/v1/collaboration/query-network?${query.toString()}`
}

/** The matching projects themselves (the third tab). */
export const matchingProjectsPath = (filterQuery: string, page: number) => {
    const query = new URLSearchParams(filterQuery)
    query.set('page', String(page))
    return `/v1/projects/search?${query.toString()}`
}

export const QUERY_LIST_PAGE_SIZE = 20

/**
 * The projects with these ids, asked for through the ordinary projects search
 * (`only=`), one page's worth at a time. The api answers in its own order, so
 * callers put the rows back in the ranking order they hold the ids in
 * (see byIdOrder).
 */
export const projectsByIdsPath = (ids: readonly string[]) => {
    const query = new URLSearchParams()
    for (const id of ids) query.append(SEARCH_PARAM.only, id)
    return `/v1/projects/search?${query.toString()}`
}

/** Rows in the order of `ids`; rows whose id is not listed are dropped. */
export function byIdOrder<T extends {id: string}>(rows: readonly T[], ids: readonly string[]): T[] {
    const position = new Map(ids.map((id, index) => [id, index]))
    return rows.filter((row) => position.has(row.id)).sort((a, b) => position.get(a.id)! - position.get(b.id)!)
}

/** "based on the top 2,000 of about 25,797 matching projects" — said out loud beside the graph. */
export function basisNote(meta: QueryNetworkResponse['meta']): string {
    const scanned = meta.projectsScanned.toLocaleString('en-US')
    const total = meta.totalCapped ? (meta.approxTotal ?? meta.totalMatches) : meta.totalMatches
    if (meta.projectsScanned >= total && !meta.totalCapped) return `Based on all ${scanned} matching projects.`
    return `Based on the top ${scanned} of ${meta.totalCapped && meta.approxTotal === null ? 'more than ' : 'about '}${total.toLocaleString('en-US')} matching projects.`
}
