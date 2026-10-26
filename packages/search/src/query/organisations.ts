import {corpusFilter, type Corpus} from './corpus.js'
import {TOTAL_CAP} from './pagination.js'
import {idsQuery, type QueryClause} from './projects.js'
import {ORG_FIELDS, sqs} from './syntax.js'
import {fuzzyQuery, suggestBlock, TYPO_POLICY} from './typo.js'

// Port of export/queries.py's `org_filters` / `orgs_body` /
// `org_autocomplete_body`.

export interface OrganisationFilters {
    corpus?: Corpus
    region?: string[]
    /** ROR institution types (`rorTypes`), including the `unknown` bucket. */
    rorType?: string[]
    country?: string[]
    /** Only organisations that can be put on a map (~18% of the project-connected ones). */
    hasGeo?: boolean
    only?: string[]
}

export function organisationFilters(filters: OrganisationFilters = {}): QueryClause[] {
    const clauses: QueryClause[] = [...corpusFilter('organisations', filters.corpus)]

    const terms: ReadonlyArray<[string[] | undefined, string]> = [
        [filters.region, 'region'],
        [filters.rorType, 'rorTypes'],
        [filters.country, 'countryCode'],
    ]
    for (const [values, field] of terms) {
        if (values?.length) clauses.push({terms: {[field]: values}})
    }

    if (filters.hasGeo) clauses.push({exists: {field: 'geo'}})
    if (filters.only?.length) clauses.push(idsQuery(filters.only))

    return clauses
}

/**
 * How hard "this institution actually does research" pushes against "this
 * name matches well" when a text query has no explicit sort.
 *
 * Measured on the dev index (28,137 organisations, denormalised counts at
 * their full values). 0.5, the value carried over from export/queries.py, left
 * "Fraunhofer Society" (3,042 projects) fourth for `fraunhofer`, behind three
 * smaller institutes whose names are shorter. 2.0 is the SMALLEST value that
 * puts it first, and precise matches survive it: `FRAUNHOFER IWU` (1 project)
 * still wins its own query, as does `Max-Planck-Gymnasium` (195). Higher
 * values buy nothing here — 5 and above only reorder `max planck`, where the
 * runners-up are all genuinely Max Planck institutes anyway.
 *
 * The `log` saturation (D33) is what keeps this safe: it is the difference
 * between 5 and 50 projects that moves a result, not the one between 5,000
 * and 50,000.
 */
const NAME_MATCH_ACTIVITY_BOOST = 2.0

export type OrganisationSort = 'relevance' | 'funding' | 'projects' | 'works'

/**
 * An explicit ranking sorts on plain doc values. Outliers do not matter for a
 * sort, and the tie-breaks keep the order stable between pages.
 */
const SORT_FIELDS: Record<Exclude<OrganisationSort, 'relevance'>, string> = {
    funding: 'total_funding_eur',
    projects: 'project_count',
    works: 'work_count',
}

function sortClauses(field: string): unknown[] {
    return [{[field]: 'desc'}, {project_count: 'desc'}, {work_count: 'desc'}]
}

export interface OrganisationsBodyOptions {
    q?: string
    size: number
    from: number
    sort?: OrganisationSort
    filters?: OrganisationFilters
    aggs?: Record<string, unknown>
    source?: readonly string[]
    mode?: 'strict' | 'fuzzy'
    /** Adds the "did you mean" term suggester (only worth asking for on the fuzzy rerun). */
    suggest?: boolean
    timeout?: string
}

export function organisationTextQuery(q: string, mode: 'strict' | 'fuzzy'): QueryClause {
    return mode === 'fuzzy' ? fuzzyQuery(q, ORG_FIELDS, TYPO_POLICY.organisations.maxExpansions) : sqs(q, ORG_FIELDS)
}

/**
 * Ranking (plan slice B): an explicit sort wins; a blank query falls back to
 * funding, because BM25 has nothing to rank on; and a text query with no
 * explicit sort blends BM25 with a `rank_feature` on project count (D33), so
 * that among ten institutions with similar names the one that actually does
 * the research comes first — without letting size alone beat an exact match,
 * which a plain sort on `project_count` would.
 */
export function organisationsBody({
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
}: OrganisationsBodyOptions): Record<string, unknown> {
    const bool: Record<string, unknown> = {
        must: organisationTextQuery(q, mode),
        filter: organisationFilters(filters),
    }

    let sortClause: unknown[] | undefined
    if (sort && sort !== 'relevance') {
        sortClause = sortClauses(SORT_FIELDS[sort])
    } else if (!q.trim()) {
        sortClause = sortClauses(SORT_FIELDS.funding)
    } else {
        bool.should = [{rank_feature: {field: 'rank_projects', log: {scaling_factor: 1.0}, boost: NAME_MATCH_ACTIVITY_BOOST}}]
    }

    return {
        track_total_hits: TOTAL_CAP,
        size,
        from,
        query: {bool},
        ...(sortClause ? {sort: sortClause} : {}),
        ...(aggs ? {aggs} : {}),
        ...(source ? {_source: [...source]} : {}),
        ...(suggest ? {suggest: suggestBlock(q, TYPO_POLICY.organisations.suggestField)} : {}),
        ...(timeout ? {timeout} : {}),
    }
}

export function organisationsCountBody({
    q = '',
    filters,
    mode = 'strict',
}: {q?: string; filters?: OrganisationFilters; mode?: 'strict' | 'fuzzy'}): Record<string, unknown> {
    return {query: {bool: {must: organisationTextQuery(q, mode), filter: organisationFilters(filters)}}}
}

/**
 * Type-ahead over the three name fields, ranked by how much research the
 * organisation actually does. `rank_feature` with `log` rather than the raw
 * count: the difference between 5 and 50 projects should matter, the
 * difference between 5,000 and 50,000 much less.
 */
export function organisationAutocompleteBody(prefix: string, size = 8): Record<string, unknown> {
    return {
        size,
        _source: ['id', 'legalName', 'legalShortName', 'countryCode', 'project_count', 'name_key'],
        query: {
            bool: {
                must: {
                    multi_match: {
                        query: prefix,
                        type: 'bool_prefix',
                        fields: [
                            'legalName.sayt',
                            'legalName.sayt._2gram',
                            'legalName.sayt._3gram',
                            'legalShortName.sayt',
                            'legalShortName.sayt._2gram',
                            'alternativeNames.sayt',
                            'alternativeNames.sayt._2gram',
                        ],
                    },
                },
                should: [{rank_feature: {field: 'rank_projects', log: {scaling_factor: 1.0}}}],
            },
        },
    }
}
