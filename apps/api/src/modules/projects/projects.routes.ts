import {
    CORPUS_KEYS,
    type EntitySuggestResponse,
    type FacetValuesResponse,
    type ProjectDetail,
    type ProjectOrganisationsResponse,
    type ProjectSearchRequest,
    type ProjectSearchResponse,
    type WorkSearchResponse,
} from '@heritagemonitor/shared'
import type {FastifyInstance} from 'fastify'
import {searchWorksFor} from '../works/works.service.js'
import {
    getProjectById,
    getProjectFacetValues,
    getProjectOrganisations,
    searchProjects,
    suggestProjects,
} from './projects.service.js'

// Transport layer: HTTP concerns only, no business logic. See
// apps/api/RULES.md rule 9 (plain functions over controller classes) and
// rule 14 (modules own their own routes).
//
// The querystring names are the web's URL params, one for one (see
// apps/web/src/common/url) — the web hook forwards the page's own URL params
// to this route, so there is no name mapping to keep in sync on either side.

interface ByIdParams {
    id: string
}

interface SuggestQuery {
    q?: string
}

/**
 * The search's own params (so the counts match what the list would show) plus
 * which facet to look in and what is being typed there.
 *
 * Deliberately NOT called `field`/`q`: both names are already search params
 * of their own (`field` is a topic-tree level, `q` is the search text), and
 * the two are independent — filtering "H2020" inside a search for "heritage"
 * needs both at once.
 */
type FacetValuesQuery = ProjectSearchRequest & {facet?: string; facetQ?: string; size?: number}

interface PagedQuery {
    page?: number
}

// Ajv's `coerceTypes` (on by default in Fastify) turns a single `?funder=EC`
// into `["EC"]`, so callers never have to special-case one value vs. the
// repeated `?funder=EC&funder=NIH` form.
const stringArrayProp = {type: 'array', items: {type: 'string'}} as const

// No maximum on `page`: the last reachable page is a fact of the index's
// result window, so the 400 for a page past it comes from
// common/search/runSearch.ts with a message that says so.
const pageProp = {type: 'integer', minimum: 1, default: 1} as const

// One definition, used by /projects/search and /projects/facet-values: the
// value lists must be aggregated under exactly the params the search ran with.
const projectSearchQueryProperties = {
    q: {type: 'string'},
    c: {type: 'string', enum: [...CORPUS_KEYS]},
    page: pageProp,
    sort: {type: 'string', enum: ['relevance', 'budget']},
    // `2019-2025`. A malformed value drops the year filter (see the service)
    // rather than failing the page.
    years: {type: 'string'},
    theme: stringArrayProp,
    pillar: stringArrayProp,
    funder: stringArrayProp,
    programme: stringArrayProp,
    region: stringArrayProp,
    topic: stringArrayProp,
    subfield: stringArrayProp,
    field: stringArrayProp,
    org: stringArrayProp,
    minority: stringArrayProp,
    only: stringArrayProp,
} as const

export async function projectsRoutes(fastify: FastifyInstance) {
    // ProjectSearchRequest (from @heritagemonitor/shared) is the TS type for
    // this querystring; the JSON schema below stays hand-written because it is
    // what drives Fastify/Ajv's runtime coercion — a transport concern the
    // shared zod schema does not need to duplicate.
    fastify.get<{Querystring: ProjectSearchRequest}>(
        '/projects/search',
        {
            schema: {querystring: {type: 'object', properties: projectSearchQueryProperties}},
        },
        async (request): Promise<ProjectSearchResponse> => searchProjects(request.query),
    )

    // Before `/projects/:id` — Fastify's router prefers the static segment, but
    // keeping them in this order makes that independent of the router.
    fastify.get<{Querystring: SuggestQuery}>(
        '/projects/suggest',
        {schema: {querystring: {type: 'object', properties: {q: {type: 'string'}}}}},
        async (request): Promise<EntitySuggestResponse> => suggestProjects(request.query.q ?? ''),
    )

    fastify.get<{Querystring: FacetValuesQuery}>(
        '/projects/facet-values',
        {
            schema: {
                querystring: {
                    type: 'object',
                    required: ['facet'],
                    properties: {
                        ...projectSearchQueryProperties,
                        facet: {type: 'string'},
                        facetQ: {type: 'string'},
                        size: {type: 'integer', minimum: 1, maximum: 100, default: 20},
                    },
                },
            },
        },
        async (request): Promise<FacetValuesResponse> => getProjectFacetValues(request.query),
    )

    fastify.get<{Params: ByIdParams}>(
        '/projects/:id',
        {schema: {params: {type: 'object', properties: {id: {type: 'string'}}, required: ['id']}}},
        async (request): Promise<ProjectDetail> => getProjectById(request.params.id),
    )

    fastify.get<{Params: ByIdParams; Querystring: PagedQuery}>(
        '/projects/:id/organisations',
        {
            schema: {
                params: {type: 'object', properties: {id: {type: 'string'}}, required: ['id']},
                querystring: {type: 'object', properties: {page: pageProp}},
            },
        },
        async (request): Promise<ProjectOrganisationsResponse> =>
            getProjectOrganisations(request.params.id, request.query.page ?? 1),
    )

    // The URL belongs to this module, the business to the works module: "the
    // works of this project" is a search over 50M works, which is theirs to
    // run (apps/api/RULES.md rule 4). Kept as a one-line delegation here
    // rather than as a function in this module's service, so the service
    // dependency graph stays acyclic — see works.service's own note.
    fastify.get<{Params: ByIdParams; Querystring: PagedQuery}>(
        '/projects/:id/works',
        {
            schema: {
                params: {type: 'object', properties: {id: {type: 'string'}}, required: ['id']},
                querystring: {type: 'object', properties: {page: pageProp}},
            },
        },
        async (request): Promise<WorkSearchResponse> => searchWorksFor({project: request.params.id}, request.query.page ?? 1),
    )
}
