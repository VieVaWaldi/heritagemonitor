import {termsAgg} from './aggregations.js'
import {corpusFilter, type Corpus} from './corpus.js'
import {TOTAL_CAP} from './pagination.js'
import {idsQuery, projectFilters, type QueryClause} from './projects.js'
import {PROJECT_FIELDS, sqs} from './syntax.js'
import {fuzzyQuery, suggestBlock, TYPO_POLICY} from './typo.js'

// Port of export/queries.py's minority queries. 278 documents, so nothing here
// is performance-critical — what matters is that a search for an INSTITUTION
// or a research phrase still finds the groups that research mentions, which a
// query against the group's own Wikidata fields cannot do (see the two-step
// search below).

export const MINORITY_FIELDS = [
    'group_name_en^5',
    'search_keywords^4',
    'native_languages^2',
    'countries^2',
    'religions',
    'subclass_of',
    // Titles of the group's top 200 projects, indexed but excluded from
    // `_source`. It exists exactly so that "photogrammetry" finds the groups
    // whose projects are about photogrammetry.
    'project_title_blob',
] as const

/**
 * Fields the index maps as `text` + a `.keyword` sub-field: analysed for
 * search, exact for filtering, sorting and aggregating. Using the bare name in
 * a `terms` filter or a facet aggregation fails outright ("Text fields are not
 * optimised for operations that require per-document field data"), so every
 * such use goes through `exactField` below.
 */
const TEXT_WITH_KEYWORD = new Set(['countries', 'native_languages', 'religions', 'subclass_of', 'group_name_en'])

export function exactField(field: string): string {
    return TEXT_WITH_KEYWORD.has(field) ? `${field}.keyword` : field
}

export interface MinorityFilters {
    corpus?: Corpus
    country?: string[]
    topic?: string[]
    type?: string[]
    religion?: string[]
    language?: string[]
    subclass?: string[]
    territory?: string[]
    home?: string[]
    hasSubgroups?: boolean
    only?: string[]
}

const TERM_FIELDS: ReadonlyArray<[keyof MinorityFilters, string]> = [
    ['country', 'countries'],
    ['topic', 'topic_ids'],
    ['type', 'source_class'],
    ['religion', 'religions'],
    ['language', 'native_languages'],
    ['subclass', 'subclass_of'],
    ['territory', 'admin_territory'],
    ['home', 'ancestral_home'],
]

export function minorityFilters(filters: MinorityFilters = {}): QueryClause[] {
    const clauses: QueryClause[] = [...corpusFilter('minorities', filters.corpus)]

    for (const [key, field] of TERM_FIELDS) {
        const values = filters[key] as string[] | undefined
        if (values?.length) clauses.push({terms: {[exactField(field)]: values}})
    }

    if (filters.hasSubgroups) clauses.push({term: {has_subgroups: true}})
    if (filters.only?.length) clauses.push(idsQuery(filters.only))

    return clauses
}

export type MinoritySort = 'relevance' | 'projects' | 'works' | 'population' | 'name'

/**
 * Blank-query order: the hand-picked seed groups first, then by how much
 * research actually mentions a group. An alphabetical list of 278 Wikidata
 * entries tells nobody where the material is.
 */
const BLANK_SORT = [{is_seed: 'desc'}, {project_count: 'desc'}, {work_count: 'desc'}]

const SORT_CLAUSES: Record<Exclude<MinoritySort, 'relevance'>, unknown[]> = {
    projects: [{project_count: 'desc'}, {work_count: 'desc'}],
    works: [{work_count: 'desc'}, {project_count: 'desc'}],
    // Most groups have no population at all; those go last rather than first.
    population: [{population: {order: 'desc', missing: '_last'}}, {project_count: 'desc'}],
    name: [{[exactField('group_name_en')]: 'asc'}],
}

export interface MinoritiesBodyOptions {
    q?: string
    size: number
    from: number
    sort?: MinoritySort
    filters?: MinorityFilters
    aggs?: Record<string, unknown>
    mode?: 'strict' | 'fuzzy'
    suggest?: boolean
    timeout?: string
    /**
     * Groups found by the two-step institution search (see
     * `minorityProjectProbeBody`), added as a `should` so they join the
     * results without displacing a direct name match.
     */
    boostQids?: string[]
}

export function minorityTextQuery(q: string, mode: 'strict' | 'fuzzy'): QueryClause {
    return mode === 'fuzzy' ? fuzzyQuery(q, MINORITY_FIELDS, TYPO_POLICY.organisations.maxExpansions) : sqs(q, MINORITY_FIELDS)
}

export function minoritiesBody({
    q = '',
    size,
    from,
    sort,
    filters,
    aggs,
    mode = 'strict',
    suggest = false,
    timeout,
    boostQids = [],
}: MinoritiesBodyOptions): Record<string, unknown> {
    const hasQuery = q.trim().length > 0
    const should: QueryClause[] = []

    if (hasQuery) {
        // A seed group is one the project chose to study; when scores are
        // close it should win. A nudge, not a sort — an exact name match on a
        // non-seed group still comes first.
        should.push({term: {is_seed: {value: true, boost: 2}}})
    }
    if (boostQids.length > 0) should.push({terms: {qid: boostQids}})

    const bool: Record<string, unknown> = {
        // With a text query the group may match EITHER its own fields or the
        // projects that mention it, so the text clause moves into `should`
        // beside the two-step qids and one of them must match.
        ...(hasQuery && should.length > 1
            ? {should: [minorityTextQuery(q, mode), ...should], minimum_should_match: 1}
            : {must: minorityTextQuery(q, mode), ...(should.length > 0 ? {should} : {})}),
        filter: minorityFilters(filters),
    }

    const explicitSort = sort && sort !== 'relevance' ? SORT_CLAUSES[sort] : undefined
    const sortClause = explicitSort ?? (hasQuery ? undefined : BLANK_SORT)

    return {
        track_total_hits: TOTAL_CAP,
        size,
        from,
        query: {bool},
        ...(sortClause ? {sort: sortClause} : {}),
        ...(aggs ? {aggs} : {}),
        ...(suggest ? {suggest: suggestBlock(q, 'group_name_en')} : {}),
        ...(timeout ? {timeout} : {}),
    }
}

export function minoritiesCountBody({
    q = '',
    filters,
    mode = 'strict',
}: {q?: string; filters?: MinorityFilters; mode?: 'strict' | 'fuzzy'}): Record<string, unknown> {
    return {query: {bool: {must: minorityTextQuery(q, mode), filter: minorityFilters(filters)}}}
}

/**
 * Step one of the two-step search: which minority groups are mentioned by the
 * PROJECTS that match this text?
 *
 * `project_title_blob` only holds each group's top 200 projects by classifier
 * score, so for the big groups (Russians: 2,242 projects) most project titles
 * are not searchable through the group document at all — and an institution
 * name like "Fraunhofer" is never in it. Asking the projects index directly
 * and folding the resulting qids back in is what makes those searches work.
 */
export function minorityProjectProbeBody(q: string, size = 300): Record<string, unknown> {
    return {
        size: 0,
        track_total_hits: false,
        query: {
            bool: {
                must: sqs(q, PROJECT_FIELDS),
                filter: [...projectFilters(), {exists: {field: 'minority_qids'}}],
            },
        },
        aggs: {qids: termsAgg('minority_qids', size)},
    }
}

/** Organisations working on a group's projects: an aggregation over projects. */
export function minorityOrganisationsBody(qids: string[], size = 200): Record<string, unknown> {
    return {
        size: 0,
        track_total_hits: false,
        query: {bool: {filter: [{terms: {minority_qids: qids}}]}},
        aggs: {orgs: termsAgg('org_ids', size)},
    }
}

/** Funders and programmes behind a group's projects, for the funding tab. */
export function minorityFundingBody(qids: string[], size = 50): Record<string, unknown> {
    return {
        size: 0,
        track_total_hits: false,
        query: {bool: {filter: [{terms: {minority_qids: qids}}]}},
        aggs: {
            funders: {
                ...termsAgg('funder', size),
                aggs: {programmes: termsAgg('programme', 5)},
            },
        },
    }
}

export function minorityAutocompleteBody(prefix: string, size = 8): Record<string, unknown> {
    return {
        size,
        _source: ['qid', 'group_name_en', 'project_count'],
        query: {
            multi_match: {
                query: prefix,
                type: 'bool_prefix',
                fields: ['group_name_en.sayt', 'group_name_en.sayt._2gram', 'group_name_en.sayt._3gram'],
            },
        },
    }
}
