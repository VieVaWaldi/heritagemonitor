import {
    CORPUS_KEYS,
    type EntitySuggestResponse,
    type FacetValuesResponse,
    type OrganisationDetail,
    type OrganisationProjectsResponse,
    type OrganisationSearchRequest,
    type OrganisationSearchResponse,
    type WorkCountResponse,
    type WorkSearchResponse,
} from '@heritagemonitor/shared'
import type {FastifyInstance} from 'fastify'
import {countWorksFor, searchWorksFor} from '../works/works.service.js'
import {
    getOrganisationById,
    getOrganisationFacetValues,
    getOrganisationProjects,
    searchOrganisations,
    suggestOrganisations,
} from './organisations.service.js'

// Transport layer: HTTP concerns only. The querystring names are the web's URL
// params, one for one (see apps/web/src/common/url) — the web hook forwards
// the page's own params here, so there is no mapping to keep in sync.

interface ByIdParams {
    id: string
}

interface SuggestQuery {
    q?: string
}

interface PagedQuery {
    page?: number
}

/** The works tabs accept the calling page's text and corpus — see searchWorksFor. */
interface WorksQuery extends PagedQuery {
    q?: string
    c?: 'science' | 'dch'
}

type FacetValuesQuery = OrganisationSearchRequest & {facet?: string; facetQ?: string; size?: number}

const stringArrayProp = {type: 'array', items: {type: 'string'}} as const
const pageProp = {type: 'integer', minimum: 1, default: 1} as const

// One definition for /search and /facet-values: the value lists must be
// aggregated under exactly the params the search ran with.
const organisationSearchQueryProperties = {
    q: {type: 'string'},
    c: {type: 'string', enum: [...CORPUS_KEYS]},
    page: pageProp,
    sort: {type: 'string', enum: ['relevance', 'funding', 'projects', 'works']},
    region: stringArrayProp,
    ror: stringArrayProp,
    country: stringArrayProp,
    only: stringArrayProp,
} as const

export async function organisationsRoutes(fastify: FastifyInstance) {
    fastify.get<{Querystring: OrganisationSearchRequest}>(
        '/organisations/search',
        {schema: {querystring: {type: 'object', properties: organisationSearchQueryProperties}}},
        async (request): Promise<OrganisationSearchResponse> => searchOrganisations(request.query),
    )

    // Before `/organisations/:id` — Fastify's router prefers the static
    // segment, but keeping them in this order makes that independent of it.
    fastify.get<{Querystring: SuggestQuery}>(
        '/organisations/suggest',
        {schema: {querystring: {type: 'object', properties: {q: {type: 'string'}}}}},
        async (request): Promise<EntitySuggestResponse> => suggestOrganisations(request.query.q ?? ''),
    )

    fastify.get<{Querystring: FacetValuesQuery}>(
        '/organisations/facet-values',
        {
            schema: {
                querystring: {
                    type: 'object',
                    required: ['facet'],
                    properties: {
                        ...organisationSearchQueryProperties,
                        facet: {type: 'string'},
                        facetQ: {type: 'string'},
                        size: {type: 'integer', minimum: 1, maximum: 100, default: 20},
                    },
                },
            },
        },
        async (request): Promise<FacetValuesResponse> => getOrganisationFacetValues(request.query),
    )

    fastify.get<{Params: ByIdParams}>(
        '/organisations/:id',
        {schema: {params: {type: 'object', properties: {id: {type: 'string'}}, required: ['id']}}},
        async (request): Promise<OrganisationDetail> => getOrganisationById(request.params.id),
    )

    fastify.get<{Params: ByIdParams; Querystring: PagedQuery}>(
        '/organisations/:id/projects',
        {
            schema: {
                params: {type: 'object', properties: {id: {type: 'string'}}, required: ['id']},
                querystring: {type: 'object', properties: {page: pageProp}},
            },
        },
        async (request): Promise<OrganisationProjectsResponse> =>
            getOrganisationProjects(request.params.id, request.query.page ?? 1),
    )

    // Same shape as /projects/:id/works: this module's URL, the works
    // module's business. See that route's note.
    fastify.get<{Params: ByIdParams; Querystring: WorksQuery}>(
        '/organisations/:id/works',
        {
            schema: {
                params: {type: 'object', properties: {id: {type: 'string'}}, required: ['id']},
                querystring: {
                    type: 'object',
                    properties: {page: pageProp, q: {type: 'string'}, c: {type: 'string', enum: [...CORPUS_KEYS]}},
                },
            },
        },
        async (request): Promise<WorkSearchResponse> =>
            searchWorksFor({organisation: request.params.id}, request.query.page ?? 1, {
                q: request.query.q,
                c: request.query.c,
            }),
    )

    // "About K of its works match your text" on the experts page. A
    // separate endpoint because it is wanted WITHOUT opening the tab, and a
    // best-effort number that may come back null.
    fastify.get<{Params: ByIdParams; Querystring: WorksQuery}>(
        '/organisations/:id/works/count',
        {
            schema: {
                params: {type: 'object', properties: {id: {type: 'string'}}, required: ['id']},
                querystring: {
                    type: 'object',
                    properties: {q: {type: 'string'}, c: {type: 'string', enum: [...CORPUS_KEYS]}},
                },
            },
        },
        async (request): Promise<WorkCountResponse> => ({
            count: await countWorksFor({organisation: request.params.id}, {q: request.query.q, c: request.query.c}),
        }),
    )
}
