import {
    CORPUS_KEYS,
    type FacetValuesResponse,
    type WorkDetail,
    type WorkOrganisationsResponse,
    type WorkProjectsResponse,
    type WorkSearchRequest,
    type WorkSearchResponse,
} from '@heritagemonitor/shared'
import type {FastifyInstance} from 'fastify'
import {searchPublishers} from '../../reference/publishers.js'
import {getWorkById, getWorkOrganisations, getWorkProjects, searchWorks} from './works.service.js'

// Transport layer: HTTP concerns only. The querystring names are the web's URL
// params, one for one (see apps/web/src/common/url).
//
// There is deliberately no `/works/suggest` and no `/works/facet-values`: at
// 50M documents neither a `search_as_you_type` field nor a terms aggregation
// is affordable, so the publisher menu is served from the in-memory table
// below and the other value lists are static constants in the shared package.

interface ByIdParams {
    id: string
}

interface PagedQuery {
    page?: number
}

interface PublishersQuery {
    q?: string
    size?: number
}

const stringArrayProp = {type: 'array', items: {type: 'string'}} as const
const pageProp = {type: 'integer', minimum: 1, default: 1} as const

const DEFAULT_PUBLISHER_RESULTS = 20

export async function worksRoutes(fastify: FastifyInstance) {
    fastify.get<{Querystring: WorkSearchRequest}>(
        '/works/search',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        q: {type: 'string'},
                        c: {type: 'string', enum: [...CORPUS_KEYS]},
                        page: pageProp,
                        sort: {type: 'string', enum: ['relevance', 'citations']},
                        years: {type: 'string'},
                        oa: stringArrayProp,
                        language: stringArrayProp,
                        publisher: stringArrayProp,
                        project: stringArrayProp,
                        org: stringArrayProp,
                        minority: stringArrayProp,
                        only: stringArrayProp,
                    },
                },
            },
        },
        async (request): Promise<WorkSearchResponse> => searchWorks(request.query),
    )

    /**
     * The publisher menu's type-ahead. Answered from the in-memory top-3,000
     * table, NOT from an aggregation: the counts are corpus-wide rather than
     * counts under the current search, which the UI says out loud.
     */
    fastify.get<{Querystring: PublishersQuery}>(
        '/works/publishers',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {q: {type: 'string'}, size: {type: 'integer', minimum: 1, maximum: 100, default: 20}},
                },
            },
        },
        async (request): Promise<FacetValuesResponse> => ({
            field: 'publisher',
            values: searchPublishers(request.query.q ?? '', request.query.size ?? DEFAULT_PUBLISHER_RESULTS),
        }),
    )

    fastify.get<{Params: ByIdParams}>(
        '/works/:id',
        {schema: {params: {type: 'object', properties: {id: {type: 'string'}}, required: ['id']}}},
        async (request): Promise<WorkDetail> => getWorkById(request.params.id),
    )

    fastify.get<{Params: ByIdParams; Querystring: PagedQuery}>(
        '/works/:id/projects',
        {
            schema: {
                params: {type: 'object', properties: {id: {type: 'string'}}, required: ['id']},
                querystring: {type: 'object', properties: {page: pageProp}},
            },
        },
        async (request): Promise<WorkProjectsResponse> => getWorkProjects(request.params.id, request.query.page ?? 1),
    )

    fastify.get<{Params: ByIdParams; Querystring: PagedQuery}>(
        '/works/:id/organisations',
        {
            schema: {
                params: {type: 'object', properties: {id: {type: 'string'}}, required: ['id']},
                querystring: {type: 'object', properties: {page: pageProp}},
            },
        },
        async (request): Promise<WorkOrganisationsResponse> =>
            getWorkOrganisations(request.params.id, request.query.page ?? 1),
    )
}
