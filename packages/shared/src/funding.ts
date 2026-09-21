import {z} from 'zod'
import {corpusSchema, pageSchema} from './search.js'

// Contract for GET /v1/funding/*.
//
// There is no `funding` index. A funding view is an AGGREGATION over the
// projects index: rank the organisations behind whatever projects the filters
// match by the money that reached them, then join their names and coordinates
// from the api's in-memory organisation table. Two endpoints share that one
// computation — a paginated ranking for the list, and a compact points payload
// for the map — because the map needs every geolocated organisation at once
// while the list needs twenty at a time.

const nullableString = z
    .string()
    .nullish()
    .transform((value) => value ?? null)

/**
 * How many organisations the ranking considers. The terms aggregation is
 * ordered by summed funding, so this is "the 500 best-funded organisations
 * among the matching projects" — not a page of them. Everything below (the
 * list's paging, the map's points, the merge) works inside this set, which is
 * what keeps one aggregation enough for both endpoints.
 */
export const FUNDING_TOP_ORGANISATIONS = 500

/**
 * `shard_size` for that aggregation. Well above the size, because a terms agg
 * ordered by a sub-aggregation is approximate: a shard only reports its own
 * top N, so an organisation that is 400th everywhere can be missed entirely
 * unless each shard returns considerably more than the final count.
 */
export const FUNDING_TOP_ORGANISATIONS_SHARD_SIZE = 2_000

/**
 * Why every euro figure on these screens is hedged. Same equal-split rule as
 * the organisations page (D13), and the same coverage hole.
 */
export const FUNDING_AMOUNT_CAVEAT =
    'Approximate: a project’s budget is split equally across its organisations, and only about 58% of projects report an amount at all.'

/** Why the map is emptier than the list. Filled in with the real share by `formatGeolocatedShare`. */
export function formatGeolocatedShare(geolocated: number, total: number): string {
    if (total <= 0) return 'No organisations to place on the map.'
    const percent = Math.round((geolocated / total) * 100)
    return `EU-centric: ${percent}% of these organisations have coordinates and can appear on the map.`
}

export const fundingOrganisationSchema = z.object({
    id: z.string(),
    name: z.string(),
    country: nullableString,
    region: nullableString,
    /** This organisation's equal-split share of the matching projects' budgets. */
    fundingEur: z.number(),
    /** How many of the matching projects it took part in. */
    projectCount: z.number(),
    /** How many index records this row stands for after the duplicate merge (D19). */
    mergedRecords: z.number(),
    /** Whether it has coordinates, i.e. whether it is on the map. */
    hasGeo: z.boolean(),
})
export type FundingOrganisation = z.infer<typeof fundingOrganisationSchema>

export const fundingOrganisationsResponseSchema = z.object({
    hits: z.array(fundingOrganisationSchema),
    /** Size of the ranked set, which is what paging runs over — not the corpus total. */
    estimatedTotalHits: z.number(),
    page: z.number(),
    pageCount: z.number(),
    /** True when the ranking hit FUNDING_TOP_ORGANISATIONS and there is more behind it. */
    capped: z.boolean(),
    /** How many of the ranked organisations have coordinates — the map's honesty note. */
    geolocated: z.number(),
    /** Total euro across the ranked set, for the header. */
    totalFundingEur: z.number(),
    /** False when the api's organisation table was still loading; the ranking is then unavailable. */
    complete: z.boolean(),
})
export type FundingOrganisationsResponse = z.infer<typeof fundingOrganisationsResponseSchema>

/**
 * One map point. Deliberately the smallest thing that can be drawn and
 * labelled: 500 of these travel on every map request, so a field added here
 * costs 500 times as much as it looks.
 */
export const fundingMapOrganisationSchema = z.object({
    id: z.string(),
    name: z.string(),
    lat: z.number(),
    lng: z.number(),
    fundingEur: z.number(),
    projectCount: z.number(),
})
export type FundingMapOrganisation = z.infer<typeof fundingMapOrganisationSchema>

export const fundingMapResponseSchema = z.object({
    /** Every GEOLOCATED organisation of the ranked set — not a page of them. */
    orgs: z.array(fundingMapOrganisationSchema),
    /** Size of the ranked set, geolocated or not, so the page can say what the map leaves out. */
    ranked: z.number(),
    complete: z.boolean(),
})
export type FundingMapResponse = z.infer<typeof fundingMapResponseSchema>

/**
 * What both endpoints accept: the projects query, plus the project filters
 * that make sense for "whose money is this". No sort — the ranking IS the
 * sort — and no facets: the filters come from the grants side of the page.
 */
export const fundingRequestSchema = z.object({
    q: z.string().optional(),
    c: corpusSchema.optional(),
    page: pageSchema.optional(),
    funder: z.array(z.string()).optional(),
    programme: z.array(z.string()).optional(),
    /** Funding-stream ids, as picked on the Programmes tab. */
    stream: z.array(z.string()).optional(),
    years: z.string().optional(),
    region: z.array(z.string()).optional(),
})
export type FundingRequest = z.infer<typeof fundingRequestSchema>
