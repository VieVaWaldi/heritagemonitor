import type {MinorityDto, MinoritySearchRequest, MinoritySearchResponse, MinoritySuggestResponse} from '@heritagemonitor/shared'
import type {FastifyInstance} from 'fastify'
import {getMinorityById, searchMinorities, suggestMinorities} from './minorities.service.js'

// Transport layer: HTTP concerns only, no business logic here. See
// apps/api/RULES.md rule 9 (plain functions over controller classes) and
// rule 14 (modules own their own routes).

interface SuggestQuery {
    q?: string
}

interface ByIdParams {
    qid: string
}

// Ajv's `coerceTypes` (on by default in Fastify) turns a single
// `?countries=France` into `["France"]` here too, so callers don't need to
// special-case the one-value case vs. repeated `?countries=France&countries=Italy`.
const stringArrayProp = {type: 'array', items: {type: 'string'}} as const

export async function minoritiesRoutes(fastify: FastifyInstance) {
    // MinoritySearchRequest (from @heritagemonitor/shared) is the TS type
    // for this querystring — the JSON-schema below stays hand-written
    // separately since that's what drives Fastify/Ajv's runtime coercion
    // (e.g. a single ?countries=France into ["France"]), a transport-layer
    // concern the shared zod schema doesn't need to duplicate.
    fastify.get<{Querystring: MinoritySearchRequest}>(
        '/minorities/search',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        q: {type: 'string'},
                        countries: stringArrayProp,
                        source_class: stringArrayProp,
                        religions: stringArrayProp,
                        native_languages: stringArrayProp,
                        subclass_of: stringArrayProp,
                        admin_territory: stringArrayProp,
                        ancestral_home: stringArrayProp,
                        has_subgroups: {type: 'boolean'},
                        sort: {
                            type: 'string',
                            enum: ['group_name_en:asc', 'group_name_en:desc', 'population:asc', 'population:desc'],
                        },
                        page: {type: 'integer', minimum: 1, default: 1},
                    },
                },
            },
        },
        async (request): Promise<MinoritySearchResponse> => {
            const {q, page, has_subgroups, sort, ...arrayFilters} = request.query
            return searchMinorities(q ?? '', {...arrayFilters, has_subgroups}, page ?? 1, sort)
        },
    )

    fastify.get<{Querystring: SuggestQuery}>(
        '/minorities/suggest',
        {schema: {querystring: {type: 'object', properties: {q: {type: 'string'}}}}},
        async (request): Promise<MinoritySuggestResponse> => {
            return suggestMinorities(request.query.q ?? '')
        },
    )

    fastify.get<{Params: ByIdParams}>(
        '/minorities/:qid',
        {schema: {params: {type: 'object', properties: {qid: {type: 'string'}}, required: ['qid']}}},
        async (request): Promise<MinorityDto> => {
            return getMinorityById(request.params.qid)
        },
    )
}
