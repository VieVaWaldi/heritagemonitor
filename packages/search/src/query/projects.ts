import {corpusFilter, type Corpus} from './corpus.js'
import {TOTAL_CAP} from './pagination.js'
import {PROJECT_FIELDS, sqs} from './syntax.js'

// Port of export/queries.py's `project_filters` / `projects_body`. Pure
// functions returning OpenSearch bodies — no client, no I/O, so they can be
// unit-tested and reused by any caller (search route, facets, experts agg,
// networks, funding).

export type QueryClause = Record<string, unknown>

export interface ProjectFilters {
    corpus?: Corpus
    /** Inclusive [from, to]; `year` is NULL outside 1950..2040 on the index. */
    year?: {from: number; to: number}
    theme?: string[]
    pillar?: string[]
    topic?: string[]
    subfield?: string[]
    field?: string[]
    funder?: string[]
    programme?: string[]
    stream?: string[]
    region?: string[]
    minority?: string[]
    hasMinority?: boolean
    /** Any-of: projects involving at least one of these organisations. */
    org?: string[]
    /** All-of: projects involving every one of these organisations (shared projects of a pair). */
    orgAll?: string[]
    /** Deep link: restrict to these document ids (`_id` == `id` on this index). */
    only?: string[]
}

const TERM_FIELDS: ReadonlyArray<[keyof ProjectFilters, string]> = [
    ['theme', 'theme'],
    ['pillar', 'pillar_list'],
    ['topic', 'topic_id'],
    ['subfield', 'subfield_id'],
    ['field', 'field_id'],
    ['funder', 'funder'],
    ['programme', 'programme'],
    ['stream', 'funding_stream_ids'],
    ['region', 'org_regions'],
    ['minority', 'minority_qids'],
    ['org', 'org_ids'],
]

export function projectFilters(filters: ProjectFilters = {}): QueryClause[] {
    const clauses: QueryClause[] = [...corpusFilter('projects', filters.corpus)]

    if (filters.year) {
        clauses.push({range: {year: {gte: filters.year.from, lte: filters.year.to}}})
    }

    for (const [key, field] of TERM_FIELDS) {
        const values = filters[key] as string[] | undefined
        if (values?.length) clauses.push({terms: {[field]: values}})
    }

    if (filters.hasMinority) clauses.push({exists: {field: 'minority_qids'}})

    // `terms` is an OR; the projects SHARED by several organisations need an
    // AND, hence one `term` clause each (see plan section 4, no org-pair index).
    for (const orgId of filters.orgAll ?? []) clauses.push({term: {org_ids: orgId}})

    if (filters.only?.length) clauses.push(idsQuery(filters.only))

    return clauses
}

/**
 * Matches by document `_id`. Used for `only=<id>` deep links on every index:
 * `works.id` is `index: false`, so a `terms` on the `id` FIELD would silently
 * match nothing there — `_id` always works.
 */
export function idsQuery(ids: string[]): QueryClause {
    return {ids: {values: ids}}
}

export type ProjectSort = 'relevance' | 'budget'

// Budget sort puts projects without an amount last (only ~58% have one) and
// keeps BM25 as the tie-break.
const SORT_CLAUSES: Record<ProjectSort, unknown[] | undefined> = {
    relevance: undefined,
    budget: [{funded_amount_eur: {order: 'desc', missing: '_last'}}, '_score'],
}

export interface ProjectsBodyOptions {
    q?: string
    size: number
    from: number
    sort?: ProjectSort
    filters?: ProjectFilters
    aggs?: Record<string, unknown>
    /** `_source` filtering: a page of 20 rows never fetches 20 full summaries. */
    source?: readonly string[]
}

export function projectsBody({q = '', size, from, sort, filters, aggs, source}: ProjectsBodyOptions): Record<string, unknown> {
    return {
        track_total_hits: TOTAL_CAP,
        size,
        from,
        query: {bool: {must: sqs(q, PROJECT_FIELDS), filter: projectFilters(filters)}},
        ...(sort && SORT_CLAUSES[sort] ? {sort: SORT_CLAUSES[sort]} : {}),
        ...(aggs ? {aggs} : {}),
        ...(source ? {_source: [...source]} : {}),
    }
}
