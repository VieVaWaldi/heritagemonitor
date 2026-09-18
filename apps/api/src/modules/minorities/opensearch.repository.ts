import {client, indices} from '@heritagemonitor/search'
import type {KnownSubgroup} from '@heritagemonitor/shared'

// Repository layer: raw OpenSearch access only, no business logic (query
// building, DTO mapping) — that lives in minorities.service.ts.

// Fields hm_pipeline's index_opensearch.py maps as text+keyword multi-fields
// (analyzed for search, `.keyword` sub-field for exact-match filter/sort/
// facet) — has to stay in sync with that mapping. Everything else requested
// as a filter/facet/sort field (source_class, admin_territory,
// ancestral_home, population, has_subgroups) is mapped keyword/numeric/
// boolean directly, no `.keyword` suffix needed.
const KEYWORD_MULTIFIELDS = new Set(['group_name_en', 'countries', 'religions', 'native_languages', 'subclass_of'])

function keywordField(field: string): string {
    return KEYWORD_MULTIFIELDS.has(field) ? `${field}.keyword` : field
}

// Query-time field boosts replicate Meilisearch's searchableAttributes
// ranking (a hit on the group's own name should always outrank one that
// only matched via a language/country/religion name) — OpenSearch has no
// index-setting equivalent for this, so it lives here instead of in
// hm_pipeline's mapping. Order/weights mirror index_meilisearch.py's
// searchableAttributes list.
const SEARCH_FIELD_BOOSTS = ['group_name_en^5', 'search_keywords^4', 'native_languages^2', 'countries^2', 'religions', 'subclass_of']

function buildTextQuery(q: string) {
    if (!q.trim()) return {match_all: {}}

    return {
        bool: {
            should: [
                {multi_match: {query: q, fields: SEARCH_FIELD_BOOSTS}},
                // known_subgroups.name is `nested` (an array of {name, qid}
                // structs) — a plain multi_match can't reach into it, so it
                // needs its own nested query clause. No boost given here;
                // OpenSearch's default scoring for this clause is a
                // reasonable stand-in for now.
                {nested: {path: 'known_subgroups', query: {match: {'known_subgroups.name': q}}}},
            ],
            minimum_should_match: 1,
        },
    }
}

export interface MinorityFilterClause {
    field: string
    values: string[]
}

function buildFilters(filters: MinorityFilterClause[], hasSubgroups?: boolean): Record<string, unknown>[] {
    const clauses: Record<string, unknown>[] = filters
        .filter((f) => f.values.length > 0)
        .map((f) => ({terms: {[keywordField(f.field)]: f.values}}))

    if (hasSubgroups != null) clauses.push({term: {has_subgroups: hasSubgroups}})

    return clauses
}

const FACET_SIZE = 100

function buildAggs(facetFields: string[]) {
    return Object.fromEntries(facetFields.map((field) => [field, {terms: {field: keywordField(field), size: FACET_SIZE}}]))
}

export interface MinoritiesSearchParams {
    q: string
    filters?: MinorityFilterClause[]
    hasSubgroups?: boolean
    facetFields?: string[]
    sort?: {field: string; order: 'asc' | 'desc'}
    limit: number
    offset: number
}

interface MinorityRawDoc {
    qid: string
    group_name_en: string
    countries: string[]
    source_class: string[]
    population: number | null
    religions: string[]
    native_languages: string[]
    subclass_of: string[]
    admin_territory: string[]
    ancestral_home: string[]
    known_subgroups: KnownSubgroup[]
    search_keywords: string[]
    has_subgroups: boolean
}

export interface TermsBucket {
    key: string | number | boolean
    key_as_string?: string
    doc_count: number
}

// The client's generated types get `hits.hits`'s element type wrong (an
// operator-precedence bug: `Hit & {_source?: T}[]` parses as
// `Hit & ({_source?: T}[])`, not `(Hit & {_source?: T})[]`, so indexing loses
// `_id`) — cast to what the OpenSearch REST API actually returns. See
// apps/api/src/modules/health/opensearch.repository.ts's note.
interface MinorityHit {
    _id: string
    _source?: MinorityRawDoc
}

export async function search({q, filters = [], hasSubgroups, facetFields = [], sort, limit, offset}: MinoritiesSearchParams) {
    const {body} = await client.search({
        index: indices.minoritiesIndexName,
        body: {
            track_total_hits: true,
            query: {
                bool: {
                    must: buildTextQuery(q),
                    filter: buildFilters(filters, hasSubgroups),
                },
            },
            aggs: buildAggs(facetFields),
            sort: sort ? [{[keywordField(sort.field)]: sort.order}] : undefined,
            from: offset,
            size: limit,
        },
    })

    const hits = body.hits.hits as unknown as MinorityHit[]
    const total = typeof body.hits.total === 'object' ? (body.hits.total?.value ?? 0) : (body.hits.total ?? 0)
    const aggregations = (body.aggregations ?? {}) as Record<string, {buckets: TermsBucket[]}>

    return {
        hits: hits.map((hit) => hit._source).filter((doc): doc is MinorityRawDoc => doc != null),
        total,
        aggregations,
    }
}

// group_name_en/search_keywords only, with match_phrase_prefix instead of
// the ranked multi_match `search()` uses — an approximation of Meilisearch's
// built-in prefix search, since the index has no edge_ngram field to give a
// true instant-search feel (would need a mapping change on hm_pipeline's
// side, not just here).
export async function suggest(q: string, limit: number) {
    const {body} = await client.search({
        index: indices.minoritiesIndexName,
        body: {
            query: {
                bool: {
                    should: [{match_phrase_prefix: {group_name_en: q}}, {match_phrase_prefix: {search_keywords: q}}],
                    minimum_should_match: 1,
                },
            },
            size: limit,
        },
    })

    const hits = body.hits.hits as unknown as MinorityHit[]
    return hits.map((hit) => hit._source).filter((doc): doc is MinorityRawDoc => doc != null)
}

export async function getById(qid: string) {
    const {body} = await client.get({index: indices.minoritiesIndexName, id: qid})
    return body._source as MinorityRawDoc
}
