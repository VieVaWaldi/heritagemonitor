import {
    CORPUS_KEYS,
    type EntitySuggestResponse,
    type MinorityDto,
    type MinorityFundersResponse,
    type MinoritySearchRequest,
    type MinoritySearchResponse,
    type MinorityTopicsResponse,
    type WorkOrganisationsResponse,
} from '@heritagemonitor/shared'
import type {FastifyInstance} from 'fastify'
import {
    getMinorityByQid,
    getMinorityFunders,
    getMinorityOrganisations,
    getMinorityTopics,
    searchMinorities,
    suggestMinorities,
} from './minorities.service.js'

// Transport layer: HTTP concerns only. Querystring names are the web's URL
// params, one for one (see apps/web/src/common/url).
//
// There is no `/minorities/:qid/projects` or `/works`: both are searches over
// those indexes with a `minority` filter, so the web calls
// `/v1/projects/search?minority=<qid>` and `/v1/works/search?minority=<qid>`
// directly — the same endpoints, the same ranking and filters as anywhere
// else, rather than two proxies that would drift from them.

interface ByQidParams {
    qid: string
}

interface SuggestQuery {
    q?: string
}

interface PagedQuery {
    page?: number
}

const stringArrayProp = {type: 'array', items: {type: 'string'}} as const
const pageProp = {type: 'integer', minimum: 1, default: 1} as const

export async function minoritiesRoutes(fastify: FastifyInstance) {
    fastify.get<{Querystring: MinoritySearchRequest}>(
        '/minorities/search',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        q: {type: 'string'},
                        c: {type: 'string', enum: [...CORPUS_KEYS]},
                        page: pageProp,
                        sort: {type: 'string', enum: ['relevance', 'projects', 'works', 'population', 'name']},
                        country: stringArrayProp,
                        topic: stringArrayProp,
                        type: stringArrayProp,
                        religion: stringArrayProp,
                        language: stringArrayProp,
                        subclass: stringArrayProp,
                        territory: stringArrayProp,
                        home: stringArrayProp,
                        hasSubgroups: {type: 'boolean'},
                        only: stringArrayProp,
                    },
                },
            },
        },
        async (request): Promise<MinoritySearchResponse> => searchMinorities(request.query),
    )

    fastify.get<{Querystring: SuggestQuery}>(
        '/minorities/suggest',
        {schema: {querystring: {type: 'object', properties: {q: {type: 'string'}}}}},
        async (request): Promise<EntitySuggestResponse> => suggestMinorities(request.query.q ?? ''),
    )

    fastify.get<{Params: ByQidParams}>(
        '/minorities/:qid',
        {schema: {params: {type: 'object', properties: {qid: {type: 'string'}}, required: ['qid']}}},
        async (request): Promise<MinorityDto> => getMinorityByQid(request.params.qid),
    )

    const pagedTab = {
        params: {type: 'object', properties: {qid: {type: 'string'}}, required: ['qid']},
        querystring: {type: 'object', properties: {page: pageProp}},
    } as const

    fastify.get<{Params: ByQidParams; Querystring: PagedQuery}>(
        '/minorities/:qid/organisations',
        {schema: pagedTab},
        async (request): Promise<WorkOrganisationsResponse> =>
            getMinorityOrganisations(request.params.qid, request.query.page ?? 1),
    )

    fastify.get<{Params: ByQidParams; Querystring: PagedQuery}>(
        '/minorities/:qid/topics',
        {schema: pagedTab},
        async (request): Promise<MinorityTopicsResponse> => getMinorityTopics(request.params.qid, request.query.page ?? 1),
    )

    fastify.get<{Params: ByQidParams; Querystring: PagedQuery}>(
        '/minorities/:qid/funders',
        {schema: pagedTab},
        async (request): Promise<MinorityFundersResponse> => getMinorityFunders(request.params.qid, request.query.page ?? 1),
    )
}
