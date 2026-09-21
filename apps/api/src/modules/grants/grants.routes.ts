import {
    CORPUS_KEYS,
    type EntitySuggestResponse,
    type FacetValuesResponse,
    type GrantDetail,
    type GrantOrganisationsResponse,
    type GrantSearchRequest,
    type GrantSearchResponse,
} from '@heritagemonitor/shared'
import type {FastifyInstance} from 'fastify'
import {getGrantById, getGrantFacetValues, getGrantOrganisations, searchGrants, suggestGrants} from './grants.service.js'

// Transport layer: HTTP concerns only. Querystring names are the web's URL
// params, one for one.
//
// A stream id is `funder::programme[::action]` — it contains `::`, spaces and
// occasionally a slash, so `:id` here always arrives percent-encoded and
// Fastify decodes it for us. Nothing else needs to know.

interface ByIdParams {
    id: string
}

interface SuggestQuery {
    q?: string
}

interface OrganisationsQuery {
    c?: 'science' | 'dch'
    q?: string
}

type FacetValuesQuery = GrantSearchRequest & {facet?: string; facetQ?: string; size?: number}

const stringArrayProp = {type: 'array', items: {type: 'string'}} as const

// One definition for /search and /facet-values: the value lists must be
// aggregated under exactly the params the search ran with.
const grantSearchQueryProperties = {
    q: {type: 'string'},
    c: {type: 'string', enum: [...CORPUS_KEYS]},
    page: {type: 'integer', minimum: 1, default: 1},
    sort: {type: 'string', enum: ['relevance', 'dchProjects', 'projects', 'funding']},
    funder: stringArrayProp,
    programme: stringArrayProp,
    jurisdiction: stringArrayProp,
    only: stringArrayProp,
} as const

const idParams = {type: 'object', properties: {id: {type: 'string'}}, required: ['id']} as const

export async function grantsRoutes(fastify: FastifyInstance) {
    fastify.get<{Querystring: GrantSearchRequest}>(
        '/grants/search',
        {schema: {querystring: {type: 'object', properties: grantSearchQueryProperties}}},
        async (request): Promise<GrantSearchResponse> => searchGrants(request.query),
    )

    // Before `/grants/:id` — Fastify prefers the static segment, but keeping
    // them in this order makes that independent of it.
    fastify.get<{Querystring: SuggestQuery}>(
        '/grants/suggest',
        {schema: {querystring: {type: 'object', properties: {q: {type: 'string'}}}}},
        async (request): Promise<EntitySuggestResponse> => suggestGrants(request.query.q ?? ''),
    )

    fastify.get<{Querystring: FacetValuesQuery}>(
        '/grants/facet-values',
        {
            schema: {
                querystring: {
                    type: 'object',
                    required: ['facet'],
                    properties: {
                        ...grantSearchQueryProperties,
                        facet: {type: 'string'},
                        facetQ: {type: 'string'},
                        size: {type: 'integer', minimum: 1, maximum: 100, default: 20},
                    },
                },
            },
        },
        async (request): Promise<FacetValuesResponse> => getGrantFacetValues(request.query),
    )

    fastify.get<{Params: ByIdParams}>(
        '/grants/:id',
        {schema: {params: idParams}},
        async (request): Promise<GrantDetail> => getGrantById(request.params.id),
    )

    fastify.get<{Params: ByIdParams; Querystring: OrganisationsQuery}>(
        '/grants/:id/organisations',
        {
            schema: {
                params: idParams,
                querystring: {type: 'object', properties: {c: {type: 'string', enum: [...CORPUS_KEYS]}, q: {type: 'string'}}},
            },
        },
        async (request): Promise<GrantOrganisationsResponse> =>
            getGrantOrganisations(request.params.id, request.query.c, request.query.q),
    )

    // No `/grants/:id/projects`: a stream's projects are a plain
    // `/v1/projects/search?stream=<id>`, which the web already knows how to
    // call, paginate and filter. A second endpoint would only be that one
    // with fewer features.
}
