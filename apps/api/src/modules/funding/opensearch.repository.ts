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
export interface FundedOrganisationsResult {
    organisations: FundedOrganisationBucket[]
    /** Project-level facet counts, from the SAME request — no extra round trip. */
    projectFacets: Record<string, Record<string, number>>
}

/**
 * The aggregations of the funding ranking. Coordinators-only swaps the
 * aggregated field and nothing else: buckets stay organisation ids, so the
 * funding sum, the merge and the row filters downstream are unchanged. A
 * project with no coordinator (everything outside the EC) has no value in
 * `coordinator_ids` and so does not count.
 */
export function fundedOrganisationAggs(coordinatorsOnly: boolean): Record<string, unknown> {
    return {
        orgs: {
            terms: {
                field: coordinatorsOnly ? 'coordinator_ids' : 'org_ids',
                size: FUNDING_TOP_ORGANISATIONS,
                shard_size: FUNDING_TOP_ORGANISATIONS_SHARD_SIZE,
                order: {funding: 'desc'},
            },
            aggs: {funding: {sum: {field: 'funded_eur_per_org'}}},
        },
        // Ride the same request: funder and programme narrow the PROJECTS
        // going into the ranking, so their counts come from this query rather
        // than from the ranked rows.
        funder: query.termsAgg('funder', 25),
        programme: query.termsAgg('programme', 25),
    }
}

export async function topFundedOrganisations(
    q: string,
    filters: query.ProjectFilters,
    /** Aggregate on the coordinating organisation instead of every partner (EC projects only). */
    coordinatorsOnly = false,
): Promise<FundedOrganisationsResult> {
    const {body} = await client.search({
        index: indices.projectsIndexName,
        body: query.projectsBody({
            q,
            from: 0,
            size: 0,
            filters,
            aggs: fundedOrganisationAggs(coordinatorsOnly),
        }),
    })

    const aggregations = body.aggregations as unknown as
        | ({orgs?: {buckets?: FundingBucket[]}} & Record<string, query.TermsAggregationResult>)
        | undefined
    const buckets = aggregations?.orgs?.buckets ?? []

    const projectFacets: Record<string, Record<string, number>> = {}
    for (const field of ['funder', 'programme']) {
        projectFacets[field] = Object.fromEntries(
            (aggregations?.[field]?.buckets ?? []).map((bucket) => [String(bucket.key_as_string ?? bucket.key), bucket.doc_count]),
        )
    }

    return {
        organisations: buckets.map((bucket) => ({
            id: String(bucket.key_as_string ?? bucket.key),
            fundingEur: bucket.funding?.value ?? 0,
            projectCount: bucket.doc_count,
        })),
        projectFacets,
    }
}
