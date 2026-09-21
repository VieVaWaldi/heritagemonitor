import {z} from 'zod'
import {organisationRowSchema} from './organisations.js'
import {projectRowSchema} from './projects.js'
import {baseSearchRequestSchema, paginatedResponseSchema, searchResponseSchema} from './search.js'

// Contract for GET /v1/works/*, mapped from the core_v4 `works` index (see
// hm_pipeline's export/mappings/works.json). 50M documents across 4 shards
// with `best_compression`, which is why this entity has no facets and no
// autocomplete: aggregating or prefix-matching over that is not something a
// search box can afford.

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

export const workRowSchema = z.object({
    id: z.string(),
    title: nullableString,
    /** The index stores the first 20; a row shows the first few of those. */
    authors: stringArray,
    author_count: nullableNumber,
    year: nullableNumber,
    publisher: nullableString,
    /** Journal, conference or repository the work appeared in. */
    container_name: nullableString,
    open_access_color: nullableString,
    citation_count: nullableNumber,
    doi: nullableString,
    pdf_url: nullableString,
    landing_url: nullableString,
    /**
     * Cultural-heritage marker, inherited from a linked project rather than
     * decided about the work itself — the UI must say "via linked project".
     */
    is_ch_via_project: nullableBoolean,
})
export type WorkRow = z.infer<typeof workRowSchema>

export const workDetailSchema = workRowSchema.extend({
    publication_date: nullableString,
    best_access_right: nullableString,
    language: nullableString,
    /** Number of organisations linked, even where the id list was capped at 100. */
    org_count: nullableNumber,
    /** 0 = linked to a project through real metadata, 1 = linked more loosely. */
    link_tier: nullableNumber,
    project_ids: stringArray,
    /** Capped at 100 on the index — `org_count` is the true number. */
    organisation_ids: stringArray,
    minority_qids: stringArray,
})
export type WorkDetail = z.infer<typeof workDetailSchema>

/**
 * Ranking. A blank query is ordered by citations (BM25 has nothing to rank
 * on); with a query, relevance keeps citations as the tie-break, so among
 * equally-matching titles the one the field actually reads comes first.
 */
export const WORK_SORT_OPTIONS = [
    {value: 'relevance', label: 'Relevance', direction: null},
    {value: 'citations', label: 'Citations (high–low)', direction: 'desc'},
] as const
export type WorkSort = (typeof WORK_SORT_OPTIONS)[number]['value']
export const workSortSchema = z.enum(['relevance', 'citations'])

export const workSearchRequestSchema = baseSearchRequestSchema.extend({
    sort: workSortSchema.optional(),
    years: z.string().optional(),
    oa: z.array(z.string()).optional(),
    language: z.array(z.string()).optional(),
    publisher: z.array(z.string()).optional(),
    /** Works of these projects / organisations — the reverse-lookup tabs. */
    project: z.array(z.string()).optional(),
    org: z.array(z.string()).optional(),
})
export type WorkSearchRequest = z.infer<typeof workSearchRequestSchema>

export const workSearchResponseSchema = searchResponseSchema(workRowSchema)
export type WorkSearchResponse = z.infer<typeof workSearchResponseSchema>

// --- static filter vocabularies ---------------------------------------------
//
// Works have NO aggregations (50M documents), so these lists are not facet
// buckets: they are the values the field can hold, measured once over the full
// corpus (see hm_pipeline's agent_job/AGENT_JOB_RESULTS.md F5/F6/F6c) and
// shipped as constants. No counts, therefore — a count would have to be
// aggregated, which is exactly what this avoids.

/**
 * Unpaywall's open-access colours. `green` exists in the vocabulary but not in
 * this corpus's data, so it is not offered; NULL (no colour recorded) is the
 * majority and cannot be filtered for.
 */
export const OPEN_ACCESS_COLORS = [
    {value: 'gold', label: 'Gold (published open access)'},
    {value: 'hybrid', label: 'Hybrid (open in a subscription journal)'},
    {value: 'bronze', label: 'Bronze (free to read, no licence)'},
] as const

export const WORK_ACCESS_RIGHTS = ['OPEN', 'CLOSED', 'RESTRICTED', 'EMBARGO'] as const

/**
 * The languages worth offering, as ISO 639-2 codes with readable names. The
 * export normalises the T/B pairs the sources mix (`fra/fre` -> `fra`), so
 * these are single codes. `und` is 36% of the corpus and means "the source
 * recorded no language", which is a real thing to filter for rather than a
 * gap to hide. Ordered by how much of the corpus they cover (F6).
 */
export const WORK_LANGUAGES = [
    {value: 'eng', label: 'English'},
    {value: 'und', label: 'Unknown / not recorded'},
    {value: 'rus', label: 'Russian'},
    {value: 'fra', label: 'French'},
    {value: 'deu', label: 'German'},
    {value: 'tur', label: 'Turkish'},
    {value: 'ita', label: 'Italian'},
    {value: 'spa', label: 'Spanish'},
    {value: 'por', label: 'Portuguese'},
    {value: 'pol', label: 'Polish'},
    {value: 'ukr', label: 'Ukrainian'},
    {value: 'fin', label: 'Finnish'},
    {value: 'hrv', label: 'Croatian'},
    {value: 'swe', label: 'Swedish'},
    {value: 'nld', label: 'Dutch'},
    {value: 'ces', label: 'Czech'},
    {value: 'ind', label: 'Indonesian'},
    {value: 'ron', label: 'Romanian'},
    {value: 'nor', label: 'Norwegian'},
    {value: 'ell', label: 'Greek'},
    {value: 'srp', label: 'Serbian'},
    {value: 'slv', label: 'Slovenian'},
    {value: 'slk', label: 'Slovak'},
    {value: 'cat', label: 'Catalan'},
    {value: 'hun', label: 'Hungarian'},
    {value: 'heb', label: 'Hebrew'},
] as const

const LANGUAGE_NAMES = new Map<string, string>(WORK_LANGUAGES.map((language) => [language.value, language.label]))

/**
 * A readable name for a stored language code. Unknown codes are shown as they
 * are: 0.13% of works kept non-ISO junk from their source (`sr (latin
 * script)`, `lv-lv`), and inventing a name for those would be a lie.
 */
export function languageName(code: string | null | undefined): string | null {
    if (!code) return null
    return LANGUAGE_NAMES.get(code) ?? code
}

export function openAccessLabel(color: string | null | undefined): string | null {
    if (!color) return null
    return OPEN_ACCESS_COLORS.find((option) => option.value === color)?.label ?? color
}

// --- the tabs ---------------------------------------------------------------

/** A work's own projects and organisations: plain id lookups, not searches. */
export const workProjectsResponseSchema = paginatedResponseSchema(projectRowSchema)
export type WorkProjectsResponse = z.infer<typeof workProjectsResponseSchema>

export const workOrganisationsResponseSchema = paginatedResponseSchema(organisationRowSchema)
export type WorkOrganisationsResponse = z.infer<typeof workOrganisationsResponseSchema>
