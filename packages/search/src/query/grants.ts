import {termsAgg} from './aggregations.js'
import {corpusFilter, type Corpus} from './corpus.js'
import {TOTAL_CAP} from './pagination.js'
import {idsQuery, projectFilters, type QueryClause} from './projects.js'
import {GRANT_FIELDS, PROJECT_FIELDS, sqs} from './syntax.js'
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
    /**
     * Stream ids found by the project probe (see `grantProjectProbeBody`),
     * added as a `should` so they join the results without displacing a stream
     * whose own description matches.
     */
    boostIds?: string[]
}

/**
 * Step one of the two-step search: which funding streams paid for the
 * PROJECTS that match this text?
 *
 * A stream document holds only its own name and hierarchy — "ERASMUS+ -
 * Cooperation for innovation…". Nothing in it says the stream funded work on
 * photogrammetry or Roma heritage, so searching a research subject against the
 * grants index alone returns nothing useful. Asking the projects index and
 * folding the resulting `funding_stream_ids` back in is what makes a subject
 * search over funding work at all.
 *
 * CAP: the aggregation returns at most `size` streams (1,000 by default,
 * against ~6,100 in the index and ~950 with heritage projects). A broad query
 * can therefore miss a stream in the long tail — acceptable because the
 * buckets come back in document-count order, so what is missed is the streams
 * with the fewest matching projects.
 */
export function grantProjectProbeBody(q: string, size = 1_000): Record<string, unknown> {
    return {
        size: 0,
        track_total_hits: false,
        query: {
            bool: {
                must: sqs(q, PROJECT_FIELDS),
                filter: [...projectFilters(), {exists: {field: 'funding_stream_ids'}}],
            },
        },
        aggs: {streams: termsAgg('funding_stream_ids', size)},
    }
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
    boostIds = [],
}: GrantsBodyOptions): Record<string, unknown> {
    const hasQuery = q.trim().length > 0

    // With a text query a stream may match EITHER its own description or the
    // projects it funded, so the text clause joins the probe's ids in `should`
    // and one of them must match. The probe ids are boosted below 1 so a
    // stream whose own name matches still outranks one that merely funded a
    // matching project.
    const bool: Record<string, unknown> =
        hasQuery && boostIds.length > 0
            ? {
                  should: [grantTextQuery(q, mode), {terms: {id: boostIds, boost: 0.6}}],
                  minimum_should_match: 1,
                  filter: grantFilters(filters),
              }
            : {must: grantTextQuery(q, mode), filter: grantFilters(filters)}

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
