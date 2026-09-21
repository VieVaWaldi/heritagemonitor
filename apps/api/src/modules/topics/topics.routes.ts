import {
    CORPUS_KEYS,
    TOPIC_COUNT_ENTITIES,
    type MinoritySearchRequest,
    type ProjectSearchRequest,
    type TopicCountEntity,
    type TopicCountsResponse,
    type TopicSearchResponse,
    type TopicTreeResponse,
} from '@heritagemonitor/shared'
import type {FastifyInstance} from 'fastify'
import {getTopicCounts, getTopicTree, searchTopics} from './topics.service.js'

// Transport layer: HTTP concerns only.
//
// The counts endpoint takes the CALLING ENTITY's own search params, so the
// numbers in the topic browser are the numbers that choosing a topic would
// actually produce. Its querystring is therefore the union of the entities'
// params rather than a list of its own.

const stringArrayProp = {type: 'array', items: {type: 'string'}} as const

type CountsQuery = ProjectSearchRequest & MinoritySearchRequest & {entity?: TopicCountEntity}

export async function topicsRoutes(fastify: FastifyInstance) {
    /** Static: the same 4,516 rows for the life of the process. */
    fastify.get('/topics/tree', async (): Promise<TopicTreeResponse> => getTopicTree())

    fastify.get<{Querystring: {q?: string}}>(
        '/topics/search',
        {schema: {querystring: {type: 'object', properties: {q: {type: 'string'}}}}},
        async (request): Promise<TopicSearchResponse> => searchTopics(request.query.q ?? ''),
    )

    fastify.get<{Querystring: CountsQuery}>(
        '/topics/counts',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        entity: {type: 'string', enum: [...TOPIC_COUNT_ENTITIES], default: 'projects'},
                        q: {type: 'string'},
                        c: {type: 'string', enum: [...CORPUS_KEYS]},
                        // The topic params are accepted and then IGNORED by the
                        // services — see getTopicCounts.
                        topic: stringArrayProp,
                        subfield: stringArrayProp,
                        field: stringArrayProp,
                        // projects
                        years: {type: 'string'},
                        theme: stringArrayProp,
                        pillar: stringArrayProp,
                        funder: stringArrayProp,
                        programme: stringArrayProp,
                        region: stringArrayProp,
                        org: stringArrayProp,
                        minority: stringArrayProp,
                        // minorities
                        country: stringArrayProp,
                        type: stringArrayProp,
                        religion: stringArrayProp,
                        language: stringArrayProp,
                        subclass: stringArrayProp,
                        territory: stringArrayProp,
                        home: stringArrayProp,
                        hasSubgroups: {type: 'boolean'},
                    },
                },
            },
        },
        async (request): Promise<TopicCountsResponse> => getTopicCounts(request.query.entity ?? 'projects', request.query),
    )
}
