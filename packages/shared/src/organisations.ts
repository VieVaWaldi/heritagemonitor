import {z} from 'zod'
import {baseSearchRequestSchema, searchResponseSchema} from './search.js'

// Contract for GET /v1/organisations/*, mapped from the core_v4
// `organisations` index (see hm_pipeline's export/mappings/organisations.json).
// Field names are the index's own, for the same reason as projects: a renamed
// DTO would need a translation table in two repos.

const nullableString = z
    .string()
    .nullish()
    .transform((value) => value ?? null)
const nullableNumber = z
    .number()
    .nullish()
    .transform((value) => value ?? null)
const nullableBoolean = z
    .boolean()
    .nullish()
    .transform((value) => value ?? false)
const stringArray = z
    .array(z.string())
    .nullish()
    .transform((value) => value ?? [])

export const organisationRowSchema = z.object({
    id: z.string(),
    legalName: nullableString,
    legalShortName: nullableString,
    countryCode: nullableString,
    /** Has an `Unknown` bucket — 157k organisations are not placed in a region. */
    region: nullableString,
    /** ROR's institution types; `unknown` where ROR has no match. */
    rorTypes: stringArray,
    rorId: nullableString,
    websiteUrl: nullableString,
    /**
     * Whether the organisation has coordinates at all. The point itself is not
     * sent (no map on these screens) — only ~18% of project-connected
     * organisations have one, so it is worth showing which.
     */
    hasGeo: z.boolean(),
    /** Global counts across the whole index, NOT counts within one project. */
    project_count: nullableNumber,
    work_count: nullableNumber,
    total_funding_eur: nullableNumber,
    /** Corpus marker: this organisation worked on at least one DCH project. */
    has_dch_project: nullableBoolean,
})
export type OrganisationRow = z.infer<typeof organisationRowSchema>

/** The whole document, for the detail panel's overview tab. */
export const organisationDetailSchema = organisationRowSchema.extend({
    openaireId: nullableString,
    alternativeNames: stringArray,
    wikiId: nullableString,
    rorStatus: nullableString,
    rorEstablished: nullableNumber,
    /** How the coordinates were obtained (ROR, address geocoding, ...); null when there are none. */
    geolocation_source: nullableString,
    address_city: nullableString,
    address_country: nullableString,
    address_street: nullableString,
    address_postalcode: nullableString,
    nuts3: nullableString,
    /** Normalised name + country — the key duplicate institutions share (D19). */
    name_key: nullableString,
    dch_project_count: nullableNumber,
})
export type OrganisationDetail = z.infer<typeof organisationDetailSchema>

/**
 * Ranking. With a text query and no explicit choice the api blends BM25 with a
 * `rank_feature` on project count (D33), so a giant institution does not drown
 * an exact name match; a blank query falls back to funding, because relevance
 * has nothing to rank on.
 */
export const ORGANISATION_SORT_OPTIONS = [
    {value: 'relevance', label: 'Relevance', direction: null},
    {value: 'funding', label: 'Funding (high–low)', direction: 'desc'},
    {value: 'projects', label: 'Projects (high–low)', direction: 'desc'},
    {value: 'works', label: 'Works (high–low)', direction: 'desc'},
] as const
export type OrganisationSort = (typeof ORGANISATION_SORT_OPTIONS)[number]['value']
export const organisationSortSchema = z.enum(['relevance', 'funding', 'projects', 'works'])

export const organisationSearchRequestSchema = baseSearchRequestSchema.extend({
    sort: organisationSortSchema.optional(),
    region: z.array(z.string()).optional(),
    /** ROR institution types. Named `ror` in the URL, `rorTypes` on the index. */
    ror: z.array(z.string()).optional(),
    country: z.array(z.string()).optional(),
})
export type OrganisationSearchRequest = z.infer<typeof organisationSearchRequestSchema>

export const organisationSearchResponseSchema = searchResponseSchema(organisationRowSchema)
export type OrganisationSearchResponse = z.infer<typeof organisationSearchResponseSchema>

/**
 * Faceted fields, in sidebar order. `countryCode` is `searchable` for the same
 * reason `programme` is on projects: ~200 values is more than a checkbox list
 * should ask anyone to scroll.
 */
export const ORGANISATION_FACET_FIELDS = [
    {field: 'region', param: 'region', label: 'Region', size: 12, searchable: false},
    {field: 'rorTypes', param: 'ror', label: 'Type', size: 15, searchable: false},
    {field: 'countryCode', param: 'country', label: 'Country', size: 25, searchable: true},
] as const
export type OrganisationFacetConfig = (typeof ORGANISATION_FACET_FIELDS)[number]
export type OrganisationFacetParam = OrganisationFacetConfig['param']
