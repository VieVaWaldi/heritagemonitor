import {termsAgg} from './aggregations.js'
import {projectsBody, type ProjectFilters, type TextMode} from './projects.js'

/**
 * The partners of one organisation: every organisation on a project the
 * centre took part in, counted by projects.
 *
 * ONE `size: 0` request over the projects index — `term org_ids = centre` plus
 * the usual project filters, and a terms aggregation on `org_ids`. The centre
 * appears in its own aggregation (it is on all of them), hence `max + 1`.
 * There is no organisation-pair index; the busiest pair is answered by this
 * plus a second query with `orgAll` when someone opens it (plan section 4).
 */
export function orgNetworkBody(centreId: string, filters: ProjectFilters, max: number): Record<string, unknown> {
    return projectsBody({
        size: 0,
        from: 0,
        filters: {...filters, orgAll: [...(filters.orgAll ?? []), centreId]},
        aggs: {partners: termsAgg('org_ids', max + 1, {order: {_count: 'desc'}})},
    })
}

/**
 * What each scanned project contributes, all doc values (verified in the
 * projects mapping: keyword/integer/double, none of them `index: false`):
 * its organisations (pairs), first the topic, the year, the budget and the
 * funder (the cluster overview). The project id is the hit's `_id`.
 */
export const QUERY_NETWORK_DOCVALUE_FIELDS = ['org_ids', 'coordinator_ids', 'topic_id', 'year', 'funded_amount_eur', 'funder']

/** Projects scanned for the query network — the top of the ranking, not all matches. */
export const QUERY_NETWORK_SCAN = 2000

/**
 * The projects a query network is counted from: the top QUERY_NETWORK_SCAN
 * matches, each carrying only its two organisation id lists.
 *
 * `_source: false` and `docvalue_fields` are the whole point: fetching
 * 2,000 full project documents (summaries included) took 24-30 s on a cold
 * cache, reading a handful of doc-value columns takes a few seconds cold and well
 * under 200 ms warm. NEVER add `_source` here.
 *
 * Ranked by relevance for a text query; a blank query has no relevance, so
 * it ranks by budget (the projects that matter most first) — the same order
 * the projects page uses for its blank list.
 */
export function queryNetworkBody(options: {
    q: string
    filters: ProjectFilters
    mode?: TextMode
    size?: number
    from?: number
    suggest?: boolean
    timeout?: string
}): Record<string, unknown> {
    const {q, filters, mode, size = QUERY_NETWORK_SCAN, from = 0, suggest, timeout} = options
    return {
        ...projectsBody({q, filters, mode, size, from, sort: q.trim() ? 'relevance' : 'budget', suggest, timeout}),
        _source: false,
        docvalue_fields: QUERY_NETWORK_DOCVALUE_FIELDS,
    }
}
