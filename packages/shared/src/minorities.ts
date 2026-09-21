import {z} from 'zod'
import {baseSearchRequestSchema, paginatedResponseSchema, searchResponseSchema} from './search.js'

// Contract for GET /v1/minorities/*, mapped from the core_v4 `minorities`
// index (see hm_pipeline's export/mappings/minorities.json). 278 groups
// derived from Wikidata, with counts denormalised from the projects and works
// indexes.
//
// The index omits a field entirely when it is NULL or empty — it does not
// store nulls — so EVERY optional field here is `.nullish()` with a
// normalising transform, never `.nullable()`. `.nullable()` requires the key
// to be PRESENT, which silently dropped every group without a population (see
// the regression test in test/minorities.test.ts).

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

export const knownSubgroupSchema = z.object({
    name: z.string(),
    qid: z.string(),
})
export type KnownSubgroup = z.infer<typeof knownSubgroupSchema>

/** How many of a group's projects fall under one topic — the Topics tab. */
export const minorityTopicCountSchema = z.object({
    topic_id: z.string(),
    n: z.number(),
})
export type MinorityTopicCount = z.infer<typeof minorityTopicCountSchema>

export const minorityDtoSchema = z.object({
    qid: z.string(),
    group_name_en: z.string(),
    countries: stringArray,
    source_class: stringArray,
    /** Double on the index; absent for most groups. */
    population: nullableNumber,
    religions: stringArray,
    native_languages: stringArray,
    subclass_of: stringArray,
    admin_territory: stringArray,
    ancestral_home: stringArray,
    known_subgroups: z
        .array(knownSubgroupSchema)
        .nullish()
        .transform((value) => value ?? []),
    search_keywords: stringArray,
    has_subgroups: nullableBoolean,

    /**
     * A group the project picked by hand as a starting point for the research,
     * rather than one harvested from Wikidata. Replaces the old
     * `source_class: 'manual_seed'` marker.
     */
    is_seed: nullableBoolean,
    /** Denormalised from the projects/works indexes; 9 groups legitimately have 0. */
    project_count: nullableNumber,
    dch_project_count: nullableNumber,
    org_count: nullableNumber,
    work_count: nullableNumber,
    topic_ids: stringArray,
    topic_counts: z
        .array(minorityTopicCountSchema)
        .nullish()
        .transform((value) => value ?? []),
    /**
     * Other Wikidata ids folded into this group. Projects may be tagged with
     * any of them, which is why a group's projects are looked up by qid AND
     * merged qids.
     */
    merged_qids: stringArray,

    /**
     * English Wikipedia article for this group, or null when it has none.
     *
     * NOT an index field: joined on by the api from reference data built from
     * Wikidata sitelinks (210 of 278 groups have an article). Null is a real
     * answer — those groups show Wikidata alone.
     */
    wikipediaUrl: z
        .string()
        .nullish()
        .transform((value) => value ?? null),
})
export type MinorityDto = z.infer<typeof minorityDtoSchema>

// `project_title_blob` is searchable on the index but excluded from `_source`,
// so it is deliberately absent here: it exists to be queried, never shown.

export type MinorityFacetField =
    | 'countries'
    | 'topic_ids'
    | 'source_class'
    | 'religions'
    | 'native_languages'
    | 'subclass_of'
    | 'admin_territory'
    | 'ancestral_home'

/**
 * Facets in sidebar order. Topics sits third, right below Country, because
 * "which research topics does this group appear in" is the question this page
 * exists to answer — it is the only facet whose values are ids, and the api
 * labels them from its in-memory topics table.
 */
export const MINORITY_FACET_FIELDS = [
    {field: 'countries', param: 'country', label: 'Country', size: 50, searchable: false, tier: 'primary'},
    {field: 'topic_ids', param: 'topic', label: 'Topic', size: 25, searchable: false, tier: 'primary'},
    {field: 'source_class', param: 'type', label: 'Type', size: 20, searchable: false, tier: 'primary'},
    {field: 'religions', param: 'religion', label: 'Religion', size: 30, searchable: false, tier: 'primary'},
    {field: 'native_languages', param: 'language', label: 'Language', size: 40, searchable: false, tier: 'primary'},
    {field: 'subclass_of', param: 'subclass', label: 'Subclass of', size: 20, searchable: false, tier: 'secondary'},
    {field: 'admin_territory', param: 'territory', label: 'Admin territory', size: 20, searchable: false, tier: 'secondary'},
    {field: 'ancestral_home', param: 'home', label: 'Ancestral home', size: 20, searchable: false, tier: 'secondary'},
] as const
export type MinorityFacetConfig = (typeof MINORITY_FACET_FIELDS)[number]
export type MinorityFacetParam = MinorityFacetConfig['param']

/**
 * Ranking. Blank: the hand-picked seed groups first, then by how much research
 * actually mentions them — an alphabetical list of 278 groups tells nobody
 * where the material is. With a query, `_score` decides and seeds only get a
 * nudge.
 */
export const MINORITY_SORT_OPTIONS = [
    {value: 'relevance', label: 'Relevance', direction: null},
    {value: 'projects', label: 'Projects (high–low)', direction: 'desc'},
    {value: 'works', label: 'Works (high–low)', direction: 'desc'},
    {value: 'population', label: 'Population (high–low)', direction: 'desc'},
    {value: 'name', label: 'Name (A–Z)', direction: 'asc'},
] as const
export type MinoritySort = (typeof MINORITY_SORT_OPTIONS)[number]['value']
export const minoritySortSchema = z.enum(['relevance', 'projects', 'works', 'population', 'name'])

export const MINORITY_SOURCE_CLASS_LABELS: Record<string, string> = {
    indigenous_to_europe: 'Indigenous people',
    'ethnic group': 'Ethnic group',
    'ethnoreligious group': 'Ethnoreligious group',
    tribe: 'Tribe',
}

export const minoritySearchRequestSchema = baseSearchRequestSchema.extend({
    sort: minoritySortSchema.optional(),
    country: z.array(z.string()).optional(),
    topic: z.array(z.string()).optional(),
    type: z.array(z.string()).optional(),
    religion: z.array(z.string()).optional(),
    language: z.array(z.string()).optional(),
    subclass: z.array(z.string()).optional(),
    territory: z.array(z.string()).optional(),
    home: z.array(z.string()).optional(),
    /** Toggle, not a list: only groups that document subgroups. */
    hasSubgroups: z.coerce.boolean().optional(),
})
export type MinoritySearchRequest = z.infer<typeof minoritySearchRequestSchema>

export const minoritySearchResponseSchema = searchResponseSchema(minorityDtoSchema)
export type MinoritySearchResponse = z.infer<typeof minoritySearchResponseSchema>

/** One row of the Topics tab: a topic the group's projects fall under. */
export const minorityTopicSchema = z.object({
    topic_id: z.string(),
    topic_name: z.string(),
    subfield_name: nullableString,
    field_name: nullableString,
    project_count: z.number(),
})
export type MinorityTopic = z.infer<typeof minorityTopicSchema>

export const minorityTopicsResponseSchema = paginatedResponseSchema(minorityTopicSchema)
export type MinorityTopicsResponse = z.infer<typeof minorityTopicsResponseSchema>

/** One row of the Funding tab: a funder/programme the group's projects came through. */
export const minorityFunderSchema = z.object({
    funder: z.string(),
    programmes: stringArray,
    project_count: z.number(),
})
export type MinorityFunder = z.infer<typeof minorityFunderSchema>

export const minorityFundersResponseSchema = paginatedResponseSchema(minorityFunderSchema)
export type MinorityFundersResponse = z.infer<typeof minorityFundersResponseSchema>

/**
 * Wikidata is the source of every group, so its entity page is the one link
 * that always exists. Wikipedia is derived from it by the client where a
 * sitelink is known; the qid page itself is always reachable.
 */
export function minorityWikidataUrl(qid: string): string {
    return `https://www.wikidata.org/wiki/${encodeURIComponent(qid)}`
}
