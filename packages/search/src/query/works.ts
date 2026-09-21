import {corpusFilter, type Corpus} from './corpus.js'
import {TOTAL_CAP} from './pagination.js'
import {idsQuery, type QueryClause} from './projects.js'
import {sqs, WORK_FIELDS} from './syntax.js'
import {fuzzyQuery, suggestBlock, TYPO_POLICY} from './typo.js'

// Port of export/queries.py's `work_filters` / `works_body`.
//
// This index is the awkward one: 50M documents, 4 shards, `best_compression`.
// There are deliberately NO aggregation builders here — no facets, no value
// type-ahead, no histogram — because every one of them would be a full scan
// over that. The filter vocabularies are static constants in
// @heritagemonitor/shared instead.

export interface WorkFilters {
    corpus?: Corpus
    year?: {from: number; to: number}
    oa?: string[]
    language?: string[]
    publisher?: string[]
    project?: string[]
    org?: string[]
    /** Deep link. `works.id` is `index: false`, so this MUST go through `_id`. */
    only?: string[]
}

export function workFilters(filters: WorkFilters = {}): QueryClause[] {
    const clauses: QueryClause[] = [...corpusFilter('works', filters.corpus)]

    if (filters.year) clauses.push({range: {year: {gte: filters.year.from, lte: filters.year.to}}})

    const terms: ReadonlyArray<[string[] | undefined, string]> = [
        [filters.oa, 'open_access_color'],
        [filters.language, 'language'],
        [filters.publisher, 'publisher'],
        [filters.project, 'project_ids'],
        [filters.org, 'organisation_ids'],
    ]
    for (const [values, field] of terms) {
        if (values?.length) clauses.push({terms: {[field]: values}})
    }

    // NEVER `{terms: {id: …}}` here: `works.id` is stored but not indexed, so
    // that clause silently matches nothing. `ids` works on `_id`, which is
    // the same value.
    if (filters.only?.length) clauses.push(idsQuery(filters.only))

    return clauses
}

export type WorkSort = 'relevance' | 'citations'

export interface WorksBodyOptions {
    q?: string
    size: number
    from: number
    sort?: WorkSort
    filters?: WorkFilters
    source?: readonly string[]
    mode?: 'strict' | 'fuzzy'
    suggest?: boolean
    timeout?: string
}

export function workTextQuery(q: string, mode: 'strict' | 'fuzzy'): QueryClause {
    return mode === 'fuzzy' ? fuzzyQuery(q, WORK_FIELDS, TYPO_POLICY.works.maxExpansions) : sqs(q, WORK_FIELDS)
}

/**
 * `citations` sorts on the count alone; anything else keeps BM25 first with
 * citations as the tie-break, so among equally-matching titles the one the
 * field actually reads comes first. A blank query has no BM25 to speak of, so
 * the caller passes `citations` for it (see the works service).
 */
export function worksBody({
    q = '',
    size,
    from,
    sort,
    filters,
    source,
    mode = 'strict',
    suggest = false,
    timeout,
}: WorksBodyOptions): Record<string, unknown> {
    return {
        track_total_hits: TOTAL_CAP,
        size,
        from,
        query: {bool: {must: workTextQuery(q, mode), filter: workFilters(filters)}},
        sort: sort === 'citations' ? [{citation_count: 'desc'}] : ['_score', {citation_count: 'desc'}],
        ...(source ? {_source: [...source]} : {}),
        ...(suggest ? {suggest: suggestBlock(q, TYPO_POLICY.works.suggestField)} : {}),
        ...(timeout ? {timeout} : {}),
    }
}

export function worksCountBody({
    q = '',
    filters,
    mode = 'strict',
}: {q?: string; filters?: WorkFilters; mode?: 'strict' | 'fuzzy'}): Record<string, unknown> {
    return {query: {bool: {must: workTextQuery(q, mode), filter: workFilters(filters)}}}
}
