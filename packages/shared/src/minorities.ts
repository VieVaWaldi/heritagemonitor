import {z} from 'zod'

// Contract for GET /v1/minorities/search, /v1/minorities/suggest and
// /v1/minorities/:qid, shared between apps/api (produces, mapped from the
// Meilisearch `minorities` index — see hm_pipeline's
// index_meilisearch.py for the raw document shape) and apps/web (validates
// at the network boundary before trusting it). Only the fields the UI
// actually uses are modeled — the raw index also carries `diaspora` (always
// empty), `part_of`/`has_parts`/`merged_qids` (pipeline-internal), which
// apps/api's mapping step drops rather than passing through.

// Which minorities fields are checkbox facets, their display label, and
// primary/secondary tiering — the one place this lives on the TS side.
// apps/api reads the field list to know which Meilisearch facets to
// request; apps/web reads the whole thing to render both the sidebar and
// the filter bar (one map, not hand-duplicated JSX) and to know which
// MinorityFilters keys are array-valued. Mirrors (but can't literally
// import — different language, different repo) the tiering rationale in
// hm_pipeline's index_meilisearch.py docstring; if that pipeline's facet
// fields ever change, this is the one place the TS side needs to follow.
export type MinorityFacetField =
    | 'countries'
    | 'source_class'
    | 'religions'
    | 'native_languages'
    | 'subclass_of'
    | 'admin_territory'
    | 'ancestral_home'

export interface MinorityFacetFieldConfig {
    field: MinorityFacetField
    label: string
    tier: 'primary' | 'secondary'
}

export const MINORITY_FACET_FIELDS: MinorityFacetFieldConfig[] = [
    {field: 'countries', label: 'Country', tier: 'primary'},
    {field: 'source_class', label: 'Type', tier: 'primary'},
    {field: 'religions', label: 'Religion', tier: 'primary'},
    {field: 'native_languages', label: 'Language', tier: 'primary'},
    {field: 'subclass_of', label: 'Subclass of', tier: 'secondary'},
    {field: 'admin_territory', label: 'Admin territory', tier: 'secondary'},
    {field: 'ancestral_home', label: 'Ancestral home', tier: 'secondary'},
]

// manual_seed/indigenous_to_europe are internal pipeline vocabulary (see
// index_meilisearch.py) and need a real relabel; the rest are already
// human-readable words, just lowercase in the raw data, so they only need
// capitalizing.
// Mirrors sortableAttributes on the `minorities` Meilisearch index
// (group_name_en, population) — the one place both apps/api's querystring
// validation and apps/web's RankingButton get this list from.
export const MINORITY_SORT_OPTIONS = [
    {value: 'group_name_en:asc', field: 'group_name_en', direction: 'asc', label: 'Name (A–Z)'},
    {value: 'group_name_en:desc', field: 'group_name_en', direction: 'desc', label: 'Name (Z–A)'},
    {value: 'population:desc', field: 'population', direction: 'desc', label: 'Population (high–low)'},
    {value: 'population:asc', field: 'population', direction: 'asc', label: 'Population (low–high)'},
] as const
export type MinoritySortOption = (typeof MINORITY_SORT_OPTIONS)[number]['value']

export const MINORITY_SOURCE_CLASS_LABELS: Record<string, string> = {
    manual_seed: 'Seed group',
    indigenous_to_europe: 'Indigenous people',
    'ethnic group': 'Ethnic group',
    'ethnoreligious group': 'Ethnoreligious group',
    tribe: 'Tribe',
}

export const knownSubgroupSchema = z.object({
    name: z.string(),
    qid: z.string(),
})
export type KnownSubgroup = z.infer<typeof knownSubgroupSchema>

export const minorityDtoSchema = z.object({
    qid: z.string(),
    group_name_en: z.string(),
    countries: z.array(z.string()),
    source_class: z.array(z.string()),
    population: z.number().nullable(),
    religions: z.array(z.string()),
    native_languages: z.array(z.string()),
    subclass_of: z.array(z.string()),
    admin_territory: z.array(z.string()),
    ancestral_home: z.array(z.string()),
    known_subgroups: z.array(knownSubgroupSchema),
    search_keywords: z.array(z.string()),
    has_subgroups: z.boolean(),
})
export type MinorityDto = z.infer<typeof minorityDtoSchema>

// One entry per filterable field requested — value -> count, same shape
// Meilisearch itself returns.
export const minorityFacetDistributionSchema = z.record(z.string(), z.record(z.string(), z.number()))
export type MinorityFacetDistribution = z.infer<typeof minorityFacetDistributionSchema>

// Query-param contract for GET /v1/minorities/search, symmetric with
// minoritySearchResponseSchema below — apps/api's route uses this for the
// querystring's TS type (Fastify's own Ajv JSON-schema still separately
// handles runtime coercion, that's transport-layer config, not the same
// duplication this fixes); apps/web's useMinoritySearch builds a value of
// this shape before serializing it to a query string.
export const minoritySearchRequestSchema = z.object({
    q: z.string().optional(),
    countries: z.array(z.string()).optional(),
    source_class: z.array(z.string()).optional(),
    religions: z.array(z.string()).optional(),
    native_languages: z.array(z.string()).optional(),
    subclass_of: z.array(z.string()).optional(),
    admin_territory: z.array(z.string()).optional(),
    ancestral_home: z.array(z.string()).optional(),
    has_subgroups: z.boolean().optional(),
    sort: z.enum(['group_name_en:asc', 'group_name_en:desc', 'population:asc', 'population:desc']).optional(),
    page: z.number().optional(),
})
export type MinoritySearchRequest = z.infer<typeof minoritySearchRequestSchema>

export const minoritySearchResponseSchema = z.object({
    hits: z.array(minorityDtoSchema),
    facetDistribution: minorityFacetDistributionSchema,
    estimatedTotalHits: z.number(),
    page: z.number(),
    pageCount: z.number(),
})
export type MinoritySearchResponse = z.infer<typeof minoritySearchResponseSchema>

export const minoritySuggestResponseSchema = z.object({
    suggestions: z.array(z.string()),
})
export type MinoritySuggestResponse = z.infer<typeof minoritySuggestResponseSchema>
