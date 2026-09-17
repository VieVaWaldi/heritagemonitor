import {
    MINORITY_FACET_FIELDS,
    minorityDtoSchema,
    type MinorityDto,
    type MinorityFacetDistribution,
    type MinoritySearchResponse,
    type MinoritySuggestResponse,
} from '@heritagemonitor/shared'
import {AppError} from '../../plugins/errors.js'
import * as meilisearchRepository from './meilisearch.repository.js'

// Service layer: business/domain logic — query building and Meilisearch-hit
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

// Meilisearch filter strings take double-quoted values — escape any
// embedded quote rather than reject/strip it, since Wikidata group/country
// names can legitimately contain one (e.g. a name with an apostrophe-like
// quote character).
function quoted(value: string): string {
    return `"${value.replace(/"/g, '\\"')}"`
}

function inFilter(field: string, values?: string[]): string | null {
    if (!values || values.length === 0) return null
    return `${field} IN [${values.map(quoted).join(', ')}]`
}

function buildFilterExpression(filters: MinoritySearchFilters): string[] {
    const clauses = [
        inFilter('countries', filters.countries),
        inFilter('source_class', filters.source_class),
        inFilter('religions', filters.religions),
        inFilter('native_languages', filters.native_languages),
        inFilter('subclass_of', filters.subclass_of),
        inFilter('admin_territory', filters.admin_territory),
        inFilter('ancestral_home', filters.ancestral_home),
    ].filter((clause): clause is string => clause !== null)

    if (filters.has_subgroups != null) clauses.push(`has_subgroups = ${filters.has_subgroups}`)

    return clauses
}

// Raw Meilisearch hits/documents are untyped (the index has no schema
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

    const result = await meilisearchRepository.search({
        q,
        filter: buildFilterExpression(filters),
        facets: FACET_FIELDS,
        sort: sort ? [sort] : undefined,
        limit,
        offset,
    })

    const estimatedTotalHits = result.estimatedTotalHits ?? 0

    return {
        hits: result.hits.map(parseMinorityDoc).filter((dto): dto is MinorityDto => dto !== null),
        facetDistribution: (result.facetDistribution ?? {}) as MinorityFacetDistribution,
        estimatedTotalHits,
        page,
        pageCount: Math.max(1, Math.ceil(estimatedTotalHits / limit)),
    }
}

// group_name_en ranks highest in the index's searchableAttributes, so
// restricting the search to just group_name_en/search_keywords here (rather
// than every searchable field, as /search does) keeps suggestions to "names
// that actually match", not groups that only matched via a shared country
// or religion.
export async function suggestMinorities(q: string): Promise<MinoritySuggestResponse> {
    if (!q.trim()) return {suggestions: []}

    const result = await meilisearchRepository.search({
        q,
        attributesToSearchOn: ['group_name_en', 'search_keywords'],
        limit: SUGGEST_LIMIT,
        offset: 0,
    })

    const suggestions: string[] = []
    const seen = new Set<string>()
    for (const hit of result.hits as Record<string, unknown>[]) {
        const name = hit.group_name_en
        if (typeof name === 'string' && !seen.has(name)) {
            seen.add(name)
            suggestions.push(name)
        }
    }

    return {suggestions}
}

export async function getMinorityById(qid: string): Promise<MinorityDto> {
    const doc = await meilisearchRepository.getById(qid).catch(() => null)
    if (!doc) throw new AppError(`Minority group '${qid}' not found`, 404)

    const dto = parseMinorityDoc(doc)
    if (!dto) throw new AppError(`Minority group '${qid}' failed schema validation`, 500)
    return dto
}
