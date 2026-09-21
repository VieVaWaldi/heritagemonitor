import {client, indices, query} from '@heritagemonitor/search'
import {FUNDING_TOP_ORGANISATIONS, FUNDING_TOP_ORGANISATIONS_SHARD_SIZE} from '@heritagemonitor/shared'

// Repository layer: raw OpenSearch access only. See apps/api/RULES.md rule 3.

/** One organisation's share of the matching projects, straight off the aggregation. */
export interface FundedOrganisationBucket {
    id: string
    fundingEur: number
    projectCount: number
}

interface FundingBucket {
    key: string
    key_as_string?: string
    doc_count: number
    funding?: {value?: number}
}

/**
 * The best-funded organisations behind a project search.
 *
 * `funded_eur_per_org` is the project's budget already divided equally among
 * its organisations (D13), so summing it inside an `org_ids` bucket gives that
 * organisation's share without the query having to know how many partners each
 * project had.
 *
 * Ordered by that sum rather than by `doc_count`: "who received the most
 * money" is a different question from "who was on the most projects", and the
 * page asks the first. `size: 0` — the projects themselves are never wanted.
 */
export async function topFundedOrganisations(q: string, filters: query.ProjectFilters): Promise<FundedOrganisationBucket[]> {
    const {body} = await client.search({
        index: indices.projectsIndexName,
        body: query.projectsBody({
            q,
            from: 0,
            size: 0,
            filters,
            aggs: {
                orgs: {
                    terms: {
                        field: 'org_ids',
                        size: FUNDING_TOP_ORGANISATIONS,
                        shard_size: FUNDING_TOP_ORGANISATIONS_SHARD_SIZE,
                        order: {funding: 'desc'},
                    },
                    aggs: {funding: {sum: {field: 'funded_eur_per_org'}}},
                },
            },
        }),
    })

    const buckets = (body.aggregations as unknown as {orgs?: {buckets?: FundingBucket[]}} | undefined)?.orgs?.buckets ?? []
    return buckets.map((bucket) => ({
        id: String(bucket.key_as_string ?? bucket.key),
        fundingEur: bucket.funding?.value ?? 0,
        projectCount: bucket.doc_count,
    }))
}
