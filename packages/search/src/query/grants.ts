import {corpusFilter, type Corpus} from './corpus.js'
import {TOTAL_CAP} from './pagination.js'
import {idsQuery, type QueryClause} from './projects.js'
import {GRANT_FIELDS, sqs} from './syntax.js'
import {fuzzyQuery, suggestBlock, TYPO_POLICY} from './typo.js'

// Bodies for the `grants` index: the funding streams projects are attributed
// to (`funder::programme` or `funder::programme::action`). Unlike the other
// entities this index has no `rank_feature` fields, so ranking here is plain
// sorting plus BM25 — there is nothing to blend.

export interface GrantFilters {
    corpus?: Corpus
    funder?: string[]
    programme?: string[]
    jurisdiction?: string[]
    /**
     * Free text the FUNDER's name must start with. Not a facet — it backs the
     * funder facet's type-ahead, which cannot use the usual `include` regexp
     * on the bucket key because those keys are codes (`EC`, `100010414`) and
     * what the user types is a name.
     */
    funderName?: string
    only?: string[]
}

export function grantFilters(filters: GrantFilters = {}): QueryClause[] {
    const clauses: QueryClause[] = [...corpusFilter('grants', filters.corpus)]

    const terms: ReadonlyArray<[string[] | undefined, string]> = [
        [filters.funder, 'funder'],
        [filters.programme, 'programme'],
        [filters.jurisdiction, 'jurisdiction'],
    ]
    for (const [values, field] of terms) {
        if (values?.length) clauses.push({terms: {[field]: values}})
    }

    if (filters.funderName?.trim()) {
        clauses.push({match_bool_prefix: {funder_name: filters.funderName.trim()}})
    }
    if (filters.only?.length) clauses.push(idsQuery(filters.only))

    return clauses
}

export type GrantSort = 'relevance' | 'dchProjects' | 'projects' | 'funding'

const SORT_FIELDS: Record<Exclude<GrantSort, 'relevance'>, string> = {
    dchProjects: 'dch_project_count',
    projects: 'project_count',
    funding: 'total_funded_eur',
}

/**
 * Tie-broken by heritage relevance first, then size. Without a tie-break the
 * hundreds of streams sharing a count would come back in an arbitrary order
 * that changes between pages.
 */
function sortClauses(field: string): unknown[] {
    return [{[field]: {order: 'desc', missing: '_last'}}, {dch_project_count: 'desc'}, {project_count: 'desc'}]
}

export function grantTextQuery(q: string, mode: 'strict' | 'fuzzy'): QueryClause {
    return mode === 'fuzzy' ? fuzzyQuery(q, GRANT_FIELDS, TYPO_POLICY.grants.maxExpansions) : sqs(q, GRANT_FIELDS)
}

export interface GrantsBodyOptions {
    q?: string
    size: number
    from: number
    sort?: GrantSort
    filters?: GrantFilters
    aggs?: Record<string, unknown>
    source?: readonly string[]
    mode?: 'strict' | 'fuzzy'
    suggest?: boolean
    timeout?: string
}

/**
 * A blank query is ordered by how many heritage projects the stream funded,
 * not by how much money it moved: the biggest streams by euro are national
 * research councils whose heritage share is a rounding error, and they would
 * fill the first pages of a heritage monitor with themselves.
 */
export function grantsBody({
    q = '',
    size,
    from,
    sort,
    filters,
    aggs,
    source,
    mode = 'strict',
    suggest = false,
    timeout,
}: GrantsBodyOptions): Record<string, unknown> {
    const bool: Record<string, unknown> = {
        must: grantTextQuery(q, mode),
        filter: grantFilters(filters),
    }

    const explicit = sort && sort !== 'relevance' ? SORT_FIELDS[sort] : undefined
    const sortClause = explicit ? sortClauses(explicit) : q.trim() ? undefined : sortClauses(SORT_FIELDS.dchProjects)

    return {
        track_total_hits: TOTAL_CAP,
        size,
        from,
        query: {bool},
        ...(sortClause ? {sort: sortClause} : {}),
        ...(aggs ? {aggs} : {}),
        ...(source ? {_source: [...source]} : {}),
        ...(suggest ? {suggest: suggestBlock(q, TYPO_POLICY.grants.suggestField)} : {}),
        ...(timeout ? {timeout} : {}),
    }
}

export function grantsCountBody({
    q = '',
    filters,
    mode = 'strict',
}: {q?: string; filters?: GrantFilters; mode?: 'strict' | 'fuzzy'}): Record<string, unknown> {
    return {query: {bool: {must: grantTextQuery(q, mode), filter: grantFilters(filters)}}}
}

/**
 * Type-ahead over the stream description, restricted to streams that funded
 * heritage work — suggesting one of the 4,546 programmes with no connection to
 * the corpus would only ever lead to an empty page.
 */
export function grantAutocompleteBody(prefix: string, size = 8): Record<string, unknown> {
    return {
        size,
        _source: ['id', 'description', 'funder', 'funder_name', 'programme', 'action', 'dch_project_count', 'is_pseudo'],
        query: {
            bool: {
                must: {
                    multi_match: {
                        query: prefix,
                        type: 'bool_prefix',
                        fields: ['description.sayt', 'description.sayt._2gram', 'description.sayt._3gram'],
                    },
                },
                filter: [{range: {dch_project_count: {gte: 1}}}],
            },
        },
        sort: ['_score', {dch_project_count: 'desc'}],
    }
}
