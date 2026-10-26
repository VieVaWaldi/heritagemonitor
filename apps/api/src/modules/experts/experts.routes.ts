import {CORPUS_KEYS, type ExpertSearchRequest, type ExpertSearchResponse} from '@heritagemonitor/shared'
import type {FastifyInstance} from 'fastify'
import {searchExperts} from './experts.service.js'

// Transport layer: HTTP concerns only.
//
// There is no `/experts/:id`: an expert IS an organisation, so the detail
// panel reads `/v1/organisations/:id` — one record, one endpoint. There is no
// `/experts/suggest` either: what a user types here is a research topic, not
// an organisation's name.

const stringArrayProp = {type: 'array', items: {type: 'string'}} as const

export async function expertsRoutes(fastify: FastifyInstance) {
    fastify.get<{Querystring: ExpertSearchRequest}>(
        '/experts/search',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        q: {type: 'string'},
                        c: {type: 'string', enum: [...CORPUS_KEYS]},
                        page: {type: 'integer', minimum: 1, default: 1},
                        sort: {type: 'string', enum: ['matches', 'funding', 'projects', 'works']},
                        // The project filters, unchanged: they narrow the
                        // projects, and the experts follow from those.
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
                        coordinators: {type: 'string', enum: ['true']},
                    },
                },
            },
        },
        async (request): Promise<ExpertSearchResponse> => searchExperts(request.query),
    )
}
