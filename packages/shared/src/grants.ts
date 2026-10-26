import {z} from 'zod'
import {baseSearchRequestSchema, searchResponseSchema} from './search.js'

// Contract for GET /v1/grants/*, mapped from the core_v4 `grants` index (see
// hm_pipeline's export/mappings/grants.json). Index field names are kept, as
// everywhere else.
//
// A "grant" here is a FUNDING STREAM, not an individual award: a programme,
// call or action that projects were funded under. Its id is the path through
// the funding hierarchy — `funder::programme` or `funder::programme::action`
// — and it is exactly what a project's `funding_stream_ids` contains, which
// is how a stream's projects are found.

const nullableString = z
    .string()
    .nullish()
    .transform((value) => value ?? null)
const nullableNumber = z
    .number()
    .nullish()
    .transform((value) => value ?? null)

export const grantRowSchema = z.object({
    /** `funder::programme[::action]`. Contains `::` and spaces — URL-encode it. */
    id: z.string(),
    /** The funder's short code (`EC`, `NWO`, `NIH`), which is what the facet filters on. */
    funder: nullableString,
    /** The funder's readable name. Absent on a handful of rows, hence nullable. */
    funder_name: nullableString,
    /** Second level of the hierarchy. Always absent on pseudo streams. */
    programme: nullableString,
    /** Third level, where there is one — 74% of streams stop at the programme. */
    action: nullableString,
    /**
     * The stream's readable name, already assembled from the hierarchy by the
     * pipeline ("Horizon 2020 Framework Programme - Standard European
     * Fellowships"). Absent on pseudo streams, which have no programme to
     * describe — fall back to the funder name via `grantTitle`.
     */
    description: nullableString,
    /** Country or `EU`. */
    jurisdiction: nullableString,
    /**
     * A PSEUDO stream (`NONE::<funder>`) is not a real programme: it collects
     * the projects a funder financed with no funding stream recorded. Shown,
     * because leaving out a funder's 585 unattributed heritage projects would
     * be the bigger distortion, but never presented as a programme.
     */
    is_pseudo: z.boolean().nullish().transform((value) => value ?? false),
    /** Projects in the stream across the WHOLE index, heritage or not. */
    project_count: nullableNumber,
    /** Of those, the ones in the cultural-heritage corpus. */
    dch_project_count: nullableNumber,
    /**
     * Total funded, in EUR, for the whole stream — NOT for its heritage share.
     * Missing on well over half the streams. Never render it without
     * `GRANT_FUNDING_CAVEAT` next to it.
     */
    total_funded_eur: nullableNumber,
})
export type GrantRow = z.infer<typeof grantRowSchema>

/** The grants index holds nothing beyond the row, so the detail view is the row. */
export const grantDetailSchema = grantRowSchema
export type GrantDetail = z.infer<typeof grantDetailSchema>

/**
 * Why every euro figure on these screens is hedged. Two separate problems:
 * the amount covers all of a stream's projects rather than its heritage ones,
 * and most streams have no amount at all. Stated wherever the number is.
 */
export const GRANT_FUNDING_CAVEAT =
    'Total for every project in this funding stream, not only the cultural-heritage ones. Many streams report no amount at all, so totals are a lower bound.'

/** What a pseudo stream is, in the words the UI uses. */
export const PSEUDO_GRANT_LABEL = 'Projects without a funding stream'
export const PSEUDO_GRANT_DESCRIPTION =
    'Projects this funder financed for which no programme or call was recorded. Grouped together so their funding is not lost, but they are not one programme.'

/**
 * What to call a stream. Pseudo streams have no description of their own, and
 * a bare id (`NONE::NWO`) is not a name anyone can read.
 */
export function grantTitle(grant: Pick<GrantRow, 'description' | 'funder_name' | 'funder' | 'is_pseudo' | 'id'>): string {
    if (grant.is_pseudo) return `${PSEUDO_GRANT_LABEL} — ${grant.funder_name ?? grant.funder ?? grant.id}`
    return grant.description ?? grant.funder_name ?? grant.id
}

/**
 * The levels of the funding hierarchy this stream sits at, outermost first,
 * for the overview's breadcrumb. Pseudo streams have only a funder.
 */
export function grantHierarchy(grant: Pick<GrantRow, 'funder' | 'funder_name' | 'programme' | 'action' | 'is_pseudo'>): Array<{
    level: 'Funder' | 'Programme' | 'Action'
    value: string
}> {
    const levels: Array<{level: 'Funder' | 'Programme' | 'Action'; value: string}> = []
    const funder = grant.funder_name ?? grant.funder
    if (funder) levels.push({level: 'Funder', value: funder})
    if (!grant.is_pseudo && grant.programme) levels.push({level: 'Programme', value: grant.programme})
    if (!grant.is_pseudo && grant.action) levels.push({level: 'Action', value: grant.action})
    return levels
}

/**
 * Ranking. The default is heritage projects, not money: the streams that moved
 * the most euro are national research councils whose heritage share is
 * marginal, and ordering by funding would hand them the first pages.
 */
export const GRANT_SORT_OPTIONS = [
    {value: 'relevance', label: 'Relevance', direction: null},
    {value: 'dchProjects', label: 'Heritage projects (high–low)', direction: 'desc'},
    {value: 'projects', label: 'All projects (high–low)', direction: 'desc'},
    {value: 'funding', label: 'Funding (high–low)', direction: 'desc'},
] as const
export type GrantSort = (typeof GRANT_SORT_OPTIONS)[number]['value']
export const grantSortSchema = z.enum(['relevance', 'dchProjects', 'projects', 'funding'])

export const grantSearchRequestSchema = baseSearchRequestSchema.extend({
    sort: grantSortSchema.optional(),
    funder: z.array(z.string()).optional(),
    programme: z.array(z.string()).optional(),
    jurisdiction: z.array(z.string()).optional(),
})
export type GrantSearchRequest = z.infer<typeof grantSearchRequestSchema>

export const grantSearchResponseSchema = searchResponseSchema(grantRowSchema)
export type GrantSearchResponse = z.infer<typeof grantSearchResponseSchema>

/**
 * Faceted fields, in sidebar order. Funder and programme are `searchable`
 * because there are ~100 and ~4,500 of them; jurisdiction is a short list.
 * The funder facet's keys are codes, so the api sends readable labels for them
 * through the response's `facetLabels`, exactly as it does for topic ids.
 */
export const GRANT_FACET_FIELDS = [
    {field: 'funder', param: 'funder', label: 'Funder', size: 20, searchable: true},
    {field: 'programme', param: 'programme', label: 'Programme', size: 20, searchable: true},
    {field: 'jurisdiction', param: 'jurisdiction', label: 'Jurisdiction', size: 25, searchable: false},
] as const
export type GrantFacetConfig = (typeof GRANT_FACET_FIELDS)[number]
export type GrantFacetParam = GrantFacetConfig['param']

/** Organisations shown on a stream's Organisations tab. */
export const GRANT_ORGANISATION_LIMIT = 20

export const grantOrganisationSchema = z.object({
    id: z.string(),
    name: z.string(),
    country: nullableString,
    /** Projects of THIS stream the organisation took part in. */
    projects: z.number(),
    /** The organisation's lifetime funding across everything, not this stream's. */
    total_funding_eur: nullableNumber,
})
export type GrantOrganisation = z.infer<typeof grantOrganisationSchema>

export const grantOrganisationsResponseSchema = z.object({
    organisations: z.array(grantOrganisationSchema),
    /** False when the organisation table was still loading and names could not be resolved. */
    complete: z.boolean(),
})
export type GrantOrganisationsResponse = z.infer<typeof grantOrganisationsResponseSchema>
