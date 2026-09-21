import {client, indices, query} from '@heritagemonitor/search'
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
