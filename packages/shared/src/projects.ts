import {z} from 'zod'
import {organisationRowSchema} from './organisations.js'
import {baseSearchRequestSchema, paginatedResponseSchema, searchResponseSchema} from './search.js'

// Contract for GET /v1/projects/search and /v1/projects/:id, shared between
// apps/api (produces, mapped from the core_v4 `projects` OpenSearch index —
// see hm_pipeline's export/mappings/projects.json for the document shape) and
// apps/web (validates at the network boundary before trusting it).
//
// Field names are the index's own, deliberately: a DTO that renames them
// would need a translation table in two repos. The api only ADDS resolved
// labels (`topic`, see below) that the index stores as bare ids.
//
// Ids are strings everywhere — a project id like 13508218431153968733 is
// past Number.MAX_SAFE_INTEGER, so parsing one as a number silently corrupts
// it.

// The index omits a field entirely when it is NULL, so every optional field is
// normalised here once rather than defaulted at each of its call sites.
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

// OpenAlex topic hierarchy names for a project's `topic_id`, resolved by the
// api from its in-memory topics table (the index stores ids only). Null when
// the project has no topic, or its id is not in the table.
export const projectTopicSchema = z.object({
    topic_name: z.string(),
    subfield_name: z.string(),
    field_name: z.string(),
    domain_name: z.string(),
})
export type ProjectTopic = z.infer<typeof projectTopicSchema>

// One row of the results list — `_source`-filtered on the api side, so a page
// of 20 never fetches 20 full summaries. The four identifier fields are part
// of the row (not only the detail) because `projectLinks` needs them: every
// listed project's DOI/CORDIS link is offered to Lucy as a source, not just
// the selected one's.
export const projectRowSchema = z.object({
    id: z.string(),
    acronym: nullableString,
    title: nullableString,
    year: nullableNumber,
    funder: stringArray,
    programme: stringArray,
    funded_amount_eur: nullableNumber,
    is_ch: nullableBoolean,
    org_count: nullableNumber,
    work_count: nullableNumber,
    topic_id: nullableString,
    topic: projectTopicSchema.nullable(),
    /**
     * Only EC projects record a coordinator; empty elsewhere. On the ROW (not
     * just the detail) because an organisation's projects tab marks which of
     * them that organisation coordinates.
     */
    coordinator_ids: stringArray,
    doi: nullableString,
    grantId: nullableString,
    openaireId: nullableString,
    websiteUrl: nullableString,
})
export type ProjectRow = z.infer<typeof projectRowSchema>

// The whole document, for the detail panel's overview tab. Extends the row
// rather than repeating it, so a field added to the row can never be missing
// from the detail.
export const projectDetailSchema = projectRowSchema.extend({
    summary: nullableString,
    keywords: nullableString,
    subjects: stringArray,
    callIdentifier: nullableString,
    startDate: nullableString,
    endDate: nullableString,
    openAccessMandateForPublications: nullableBoolean,
    openAccessMandateForDataset: nullableBoolean,
    frameworkProgrammes: stringArray,
    currency: nullableString,
    funded_amount: nullableNumber,
    // Equal split of funded_amount_eur across the project's organisations
    // (D13) — NULL when org_count is 0. Always presented as approximate.
    funded_eur_per_org: nullableNumber,
    is_translated: nullableBoolean,
    // The classifier score behind `is_ch`. Displayed only, never filtered on.
    pred: nullableNumber,
    minority_qids: stringArray,
    pillar_list: stringArray,
    theme: nullableString,
    subfield_id: nullableString,
    field_id: nullableString,
    domain_id: nullableString,
    /** Coordinators first (see coordinator_ids), then the remaining partners. */
    org_ids: stringArray,
    org_names: stringArray,
    org_regions: stringArray,
    org_countries: stringArray,
    funder_names: stringArray,
    funding_stream_ids: stringArray,
})
export type ProjectDetail = z.infer<typeof projectDetailSchema>

// `relevance` is BM25 over the text fields (meaningless without a query, so a
// blank query falls back to `budget` — the api decides, see
// projects.service.ts). No alphabetical sort: nobody looks for projects by
// first letter of the title.
export const PROJECT_SORT_OPTIONS = [
    {value: 'relevance', label: 'Relevance', direction: null},
    {value: 'budget', label: 'Budget (high–low)', direction: 'desc'},
] as const
export type ProjectSort = (typeof PROJECT_SORT_OPTIONS)[number]['value']
export const projectSortSchema = z.enum(['relevance', 'budget'])

// Mirrors the /search URL params one for one (apps/web/src/common/url) — the
// web hook forwards the URL's own params to the api, so a new filter is one
// name in one place, not a URL name plus an api name plus a mapping.
export const projectSearchRequestSchema = baseSearchRequestSchema.extend({
    sort: projectSortSchema.optional(),
    /** `2019-2025` — one param so a range can never arrive half-updated. */
    years: z.string().optional(),
    theme: z.array(z.string()).optional(),
    pillar: z.array(z.string()).optional(),
    funder: z.array(z.string()).optional(),
    programme: z.array(z.string()).optional(),
    region: z.array(z.string()).optional(),
    /** Topic-tree selections, three levels, capped at MAX_URL_TOPICS in total. */
    topic: z.array(z.string()).optional(),
    subfield: z.array(z.string()).optional(),
    field: z.array(z.string()).optional(),
    /** Any-of: projects involving at least one of these organisations. */
    org: z.array(z.string()).optional(),
})
export type ProjectSearchRequest = z.infer<typeof projectSearchRequestSchema>

export const projectSearchResponseSchema = searchResponseSchema(projectRowSchema)
export type ProjectSearchResponse = z.infer<typeof projectSearchResponseSchema>

/**
 * Faceted fields of the projects index, in sidebar order, each with the URL
 * param that filters on it. One list, read by three places: apps/api (which
 * aggregations to request), apps/web's facet shaping, and the chat context's
 * description of the active filters. `theme` and `pillar_list` are sparse
 * today but stay in the UI (decision: more values are coming).
 *
 * `size` is how many buckets the api asks for. `programme` gets far more than
 * the others because the index holds ~4.5k of them and its UI is a searchable
 * menu rather than a checkbox list; the rest are short enough to show whole.
 */
export const PROJECT_FACET_FIELDS = [
    {field: 'topic_id', param: 'topic', label: 'Topic', size: 25, searchable: false},
    {field: 'funder', param: 'funder', label: 'Funder', size: 25, searchable: false},
    {field: 'programme', param: 'programme', label: 'Programme', size: 200, searchable: true},
    {field: 'pillar_list', param: 'pillar', label: 'Pillar', size: 10, searchable: false},
    {field: 'theme', param: 'theme', label: 'Theme', size: 10, searchable: false},
    {field: 'org_regions', param: 'region', label: 'Region', size: 10, searchable: false},
] as const
export type ProjectFacetConfig = (typeof PROJECT_FACET_FIELDS)[number]
export type ProjectFacetField = ProjectFacetConfig['field']
export type ProjectFacetParam = ProjectFacetConfig['param']

/** The year histogram that sits behind the year control — `histogram` on `year`, interval 1. */
export const PROJECT_YEAR_HISTOGRAM = 'year_histogram'

// --- organisations tab ------------------------------------------------------

/**
 * One row of a project's organisations tab. The organisation fields come from
 * the shared row schema (Step 3's organisations entity uses the same one);
 * `isCoordinator` is the only thing that is true of an organisation *in this
 * project* rather than of the organisation itself.
 */
export const projectOrganisationSchema = organisationRowSchema.extend({
    /** Only EC projects record a coordinator; false everywhere else. */
    isCoordinator: z.boolean(),
})
export type ProjectOrganisation = z.infer<typeof projectOrganisationSchema>

export const projectOrganisationsResponseSchema = paginatedResponseSchema(projectOrganisationSchema)
export type ProjectOrganisationsResponse = z.infer<typeof projectOrganisationsResponseSchema>

// --- the other direction: one organisation's projects -----------------------

/**
 * A project as listed on an ORGANISATION's projects tab: the ordinary row,
 * plus whether that organisation is the one coordinating it.
 */
export const organisationProjectSchema = projectRowSchema.extend({
    isCoordinator: z.boolean(),
})
export type OrganisationProject = z.infer<typeof organisationProjectSchema>

export const organisationProjectsResponseSchema = searchResponseSchema(organisationProjectSchema)
export type OrganisationProjectsResponse = z.infer<typeof organisationProjectsResponseSchema>
