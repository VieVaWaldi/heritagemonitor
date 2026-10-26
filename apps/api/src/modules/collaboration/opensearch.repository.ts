import {client, indices, query} from '@heritagemonitor/search'
import {runSearch, type SearchExecution} from '../../common/search/runSearch.js'
import type {PartnerBucket} from './network.js'

// Repository layer: raw OpenSearch access only. See apps/api/RULES.md rule 3.

interface TermsBucket {
    key: string
    key_as_string?: string
    doc_count: number
}

/**
 * The organisations that share projects with `centreId` under these filters,
 * most shared projects first — the centre's own bucket included (its count is
 * the centre's own matching projects).
 */
export async function topPartners(centreId: string, filters: query.ProjectFilters, max: number): Promise<PartnerBucket[]> {
    const {body} = await client.search({
        index: indices.projectsIndexName,
        body: query.orgNetworkBody(centreId, filters, max),
    })
    const aggregations = body.aggregations as unknown as {partners?: {buckets?: TermsBucket[]}} | undefined
    return (aggregations?.partners?.buckets ?? []).map((bucket) => ({
        id: String(bucket.key_as_string ?? bucket.key),
        count: bucket.doc_count,
    }))
}

// --- the query network -------------------------------------------------------

export interface QueryNetworkScanParams {
    q: string
    filters: query.ProjectFilters
    typoTolerant: boolean
}

/**
 * The top QUERY_NETWORK_SCAN projects of a search, each reduced to its two
 * id lists (`_source: false`, see query.queryNetworkBody).
 *
 * Through the shared `runSearch`, so the typo fallback, "did you mean" and the
 * strict/fuzzy mode behave exactly as on the projects page — it is the same
 * query — and the approximate total comes from the same `_count`.
 */
export async function scanProjects(params: QueryNetworkScanParams): Promise<SearchExecution<never>> {
    const {threshold, timeout} = query.TYPO_POLICY.projects
    const common = {q: params.q, filters: params.filters}

    return runSearch<never>({
        index: indices.projectsIndexName,
        page: 1,
        size: query.QUERY_NETWORK_SCAN,
        body: (window) => query.queryNetworkBody({...common, from: window.from, size: window.size}),
        countBody: (mode) => query.projectsCountBody({...common, mode}),
        ...(params.typoTolerant
            ? {
                  fallback: {
                      threshold,
                      body: (window) =>
                          query.queryNetworkBody({...common, from: window.from, size: window.size, mode: 'fuzzy', suggest: true, timeout}),
                  },
              }
            : {}),
    })
}
