import {termsAgg} from './aggregations.js'
import {projectsBody, type ProjectFilters} from './projects.js'

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
