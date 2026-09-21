import {
    CORPUS_KEYS,
    ORG_NETWORK_HARD_MAX,
    QUERY_NETWORK_HARD_MAX_EDGES,
    type OrganisationNetworkRequest,
    type OrganisationNetworkResponse,
    type QueryNetworkRequest,
    type QueryNetworkResponse,
} from '@heritagemonitor/shared'
import type {FastifyInstance} from 'fastify'
import {getOrganisationNetwork, getQueryNetwork} from './collaboration.service.js'

// Transport layer: HTTP concerns only. The querystring names are the web's URL
// params, one for one (see apps/web/src/common/url).

const stringArrayProp = {type: 'array', items: {type: 'string'}} as const

export async function collaborationRoutes(fastify: FastifyInstance) {
    fastify.get<{Params: {id: string}; Querystring: OrganisationNetworkRequest}>(
        '/collaboration/organisations/:id/network',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        c: {type: 'string', enum: [...CORPUS_KEYS]},
                        years: {type: 'string'},
                        funder: stringArrayProp,
                        programme: stringArrayProp,
                        topic: stringArrayProp,
                        subfield: stringArrayProp,
                        field: stringArrayProp,
                        max: {type: 'integer', minimum: 1, maximum: ORG_NETWORK_HARD_MAX},
                    },
                },
            },
        },
        async (request): Promise<OrganisationNetworkResponse> => getOrganisationNetwork(request.params.id, request.query),
    )

    fastify.get<{Querystring: QueryNetworkRequest}>(
        '/collaboration/query-network',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        q: {type: 'string'},
                        c: {type: 'string', enum: [...CORPUS_KEYS]},
                        years: {type: 'string'},
                        funder: stringArrayProp,
                        programme: stringArrayProp,
                        topic: stringArrayProp,
                        subfield: stringArrayProp,
                        field: stringArrayProp,
                        maxEdges: {type: 'integer', minimum: 1, maximum: QUERY_NETWORK_HARD_MAX_EDGES},
                    },
                },
            },
        },
        async (request): Promise<QueryNetworkResponse> => getQueryNetwork(request.query),
    )
}
