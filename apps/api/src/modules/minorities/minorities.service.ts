import {
    MINORITY_FACET_FIELDS,
    minorityDtoSchema,
    type MinorityDto,
    type MinorityFacetDistribution,
    type MinoritySearchResponse,
    type MinoritySuggestResponse,
} from '@heritagemonitor/shared'
import {AppError} from '../../plugins/errors.js'
import * as opensearchRepository from './opensearch.repository.js'
import type {MinorityFilterClause, TermsBucket} from './opensearch.repository.js'

// Service layer: business/domain logic — query building and OpenSearch-hit
// -> DTO mapping. Agnostic of transport, storage details live in the
// repository. See apps/api/RULES.md rule 3.

const PAGE_SIZE = 20
const SUGGEST_LIMIT = 6

// Requested on every /search call so the sidebar/filter bar always reflects
// facet counts for the current query+filter state, not a separate call.
// The seven checkbox-facet fields come from the shared config (the one
// place that list lives); has_subgroups is the toggle, not part of that
// tiered list, so it's appended here.
const FACET_FIELDS = [...MINORITY_FACET_FIELDS.map((f) => f.field), 'has_subgroups']

export interface MinoritySearchFilters {
    countries?: string[]
    source_class?: string[]
    religions?: string[]
    native_languages?: string[]
    subclass_of?: string[]
    admin_territory?: string[]
    ancestral_home?: string[]
    has_subgroups?: boolean
}

const FILTER_FIELDS = ['countries', 'source_class', 'religions', 'native_languages', 'subclass_of', 'admin_territory', 'ancestral_home'] as const

function buildFilterClauses(filters: MinoritySearchFilters): MinorityFilterClause[] {
    return FILTER_FIELDS.filter((field) => filters[field] && filters[field]!.length > 0).map((field) => ({
        field,
        values: filters[field]!,
    }))
}

function parseSort(sort?: string): {field: string; order: 'asc' | 'desc'} | undefined {
    if (!sort) return undefined
    const [field, order] = sort.split(':')
    return {field, order: order as 'asc' | 'desc'}
}

// OpenSearch's terms-aggregation buckets -> the same {field: {value: count}}
// shape Meilisearch's facetDistribution already returned, so nothing
// downstream (apps/web) needs to change. key_as_string covers boolean
// buckets (has_subgroups comes back as key: 0/1, key_as_string: "false"/
// "true") -- falls back to String(key) for everything else.
function toFacetDistribution(aggregations: Record<string, {buckets: TermsBucket[]}>): MinorityFacetDistribution {
    return Object.fromEntries(
        Object.entries(aggregations).map(([field, agg]) => [
            field,
            Object.fromEntries(agg.buckets.map((bucket) => [bucket.key_as_string ?? String(bucket.key), bucket.doc_count])),
        ]),
    )
}

// Raw OpenSearch hits/documents are untyped (the index has no schema
// Meilisearch itself enforces) — this is the one place that trusts their
// shape, validating against the same minorityDtoSchema the API's own
// response contract is built from (rather than hand-defaulting each field)
// so a genuinely malformed document is caught here, not served silently
// mangled. Returns null on failure — callers decide whether that means
// "drop this one hit" (a search response) or "this lookup failed" (a
// single-document fetch).
function parseMinorityDoc(raw: unknown): MinorityDto | null {
    const result = minorityDtoSchema.safeParse(raw)
    if (result.success) return result.data

    const qid = typeof raw === 'object' && raw !== null && 'qid' in raw ? String((raw as {qid: unknown}).qid) : 'unknown'
    console.warn(`Minority document '${qid}' failed schema validation:`, result.error.issues)
    return null
}

export async function searchMinorities(
    q: string,
    filters: MinoritySearchFilters,
    page: number,
    sort?: string,
): Promise<MinoritySearchResponse> {
    const limit = PAGE_SIZE
    const offset = (page - 1) * limit

    const result = await opensearchRepository.search({
        q,
        filters: buildFilterClauses(filters),
        hasSubgroups: filters.has_subgroups,
        facetFields: FACET_FIELDS,
        sort: parseSort(sort),
        limit,
        offset,
    })

    return {
        hits: result.hits.map(parseMinorityDoc).filter((dto): dto is MinorityDto => dto !== null),
        facetDistribution: toFacetDistribution(result.aggregations),
        estimatedTotalHits: result.total,
        page,
        pageCount: Math.max(1, Math.ceil(result.total / limit)),
    }
}

// group_name_en ranks highest in search()'s field boosts, but suggest() uses
// its own prefix-only query (see opensearch.repository.ts) rather than
// search()'s ranked one, keeping suggestions to "names that actually
// prefix-match", not groups that only matched via a shared country or
// religion.
export async function suggestMinorities(q: string): Promise<MinoritySuggestResponse> {
    if (!q.trim()) return {suggestions: []}

    const docs = await opensearchRepository.suggest(q, SUGGEST_LIMIT)

    const suggestions: string[] = []
    const seen = new Set<string>()
    for (const doc of docs) {
        if (!seen.has(doc.group_name_en)) {
            seen.add(doc.group_name_en)
            suggestions.push(doc.group_name_en)
        }
    }

    return {suggestions}
}

export async function getMinorityById(qid: string): Promise<MinorityDto> {
    const doc = await opensearchRepository.getById(qid).catch(() => null)
    if (!doc) throw new AppError(`Minority group '${qid}' not found`, 404)

    const dto = parseMinorityDoc(doc)
    if (!dto) throw new AppError(`Minority group '${qid}' failed schema validation`, 500)
    return dto
}
