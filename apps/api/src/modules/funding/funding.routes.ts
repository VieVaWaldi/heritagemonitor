import {CORPUS_KEYS, type FundingMapResponse, type FundingOrganisationsResponse, type FundingRequest} from '@heritagemonitor/shared'
import type {FastifyInstance} from 'fastify'
import {getFundingMap, getFundingOrganisations} from './funding.service.js'

// Transport layer: HTTP concerns only. The querystring names are the web's URL
// params, one for one (see apps/web/src/common/url).

const stringArrayProp = {type: 'array', items: {type: 'string'}} as const

// One definition for both endpoints: the map and the list must be aggregated
// under exactly the same filters or they would show different worlds.
const fundingQueryProperties = {
    q: {type: 'string'},
    c: {type: 'string', enum: [...CORPUS_KEYS]},
    funder: stringArrayProp,
    programme: stringArrayProp,
    stream: stringArrayProp,
    years: {type: 'string'},
    region: stringArrayProp,
} as const

export async function fundingRoutes(fastify: FastifyInstance) {
    fastify.get<{Querystring: FundingRequest}>(
        '/funding/organisations',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {...fundingQueryProperties, page: {type: 'integer', minimum: 1, default: 1}},
                },
            },
        },
        async (request): Promise<FundingOrganisationsResponse> => getFundingOrganisations(request.query),
    )

    // No `page`: the map takes the whole ranked set at once (see the service).
    fastify.get<{Querystring: FundingRequest}>(
        '/funding/map',
        {schema: {querystring: {type: 'object', properties: fundingQueryProperties}}},
        async (request): Promise<FundingMapResponse> => getFundingMap(request.query),
    )
}
