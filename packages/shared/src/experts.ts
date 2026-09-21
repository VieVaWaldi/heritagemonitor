import {z} from 'zod'
import {organisationRowSchema} from './organisations.js'
import {projectSearchRequestSchema} from './projects.js'
import {searchResponseSchema} from './search.js'

// Contract for GET /v1/experts/search.
//
// There is no experts index (decision D9). An "expert" is an ORGANISATION,
// ranked by how much of the research YOU just searched for it actually did —
// so the query runs against projects and the organisations fall out of an
// aggregation over `org_ids`. That is why this request is the projects
// request: every filter narrows the projects, and the experts follow.

export const expertRowSchema = organisationRowSchema.extend({
    /**
     * Projects matching the CURRENT search that this organisation worked on.
     * The number that ranks the list — not `project_count`, which is its
     * lifetime total and is shown beside it as "in total".
     */
    matchedProjects: z.number(),
    /**
     * How many index records were folded into this row. The same institution
     * appears under several ids (D19); their matches are summed and the
     * best-ranked id represents them, so a row can stand for more than one.
     */
    mergedRecords: z.number(),
    /** The other ids merged in, for anyone following the row to its organisation page. */
    mergedIds: z.array(z.string()),
})
export type ExpertRow = z.infer<typeof expertRowSchema>

/**
 * `matches` is the default and the only ranking that answers the question
 * being asked ("who did most of THIS work"). The others rank by the
 * organisation's lifetime figures, which is a different — and much broader —
 * question, so they are offered but never the default.
 */
export const EXPERT_SORT_OPTIONS = [
    {value: 'matches', label: 'Matching projects', direction: 'desc'},
    {value: 'funding', label: 'Funding (high–low)', direction: 'desc'},
    {value: 'projects', label: 'Projects in total (high–low)', direction: 'desc'},
    {value: 'works', label: 'Publications in total (high–low)', direction: 'desc'},
] as const
export type ExpertSort = (typeof EXPERT_SORT_OPTIONS)[number]['value']
export const expertSortSchema = z.enum(['matches', 'funding', 'projects', 'works'])

/**
 * The projects request, with the experts' own ranking. `sort` is overridden
 * rather than extended: the projects sorts (`relevance`, `budget`) rank
 * projects, and nothing here shows a project.
 */
export const expertSearchRequestSchema = projectSearchRequestSchema.omit({sort: true}).extend({
    sort: expertSortSchema.optional(),
})
export type ExpertSearchRequest = z.infer<typeof expertSearchRequestSchema>

export const expertSearchResponseSchema = searchResponseSchema(expertRowSchema).extend({
    /**
     * How many organisations the aggregation ranked, before paging. The list
     * stops at EXPERT_LIST_LIMIT even when far more organisations match, so
     * the UI can say that out loud instead of implying a complete ranking.
     */
    rankedOrganisations: z.number(),
    /** True when that cap actually bit. */
    listCapped: z.boolean(),
})
export type ExpertSearchResponse = z.infer<typeof expertSearchResponseSchema>

/**
 * How deep the ranking goes. A terms aggregation has to name a size, and
 * beyond a couple of hundred nobody is reading: this is "the top experts for
 * your search", not a directory.
 */
export const EXPERT_LIST_LIMIT = 200
