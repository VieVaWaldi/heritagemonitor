import {CORPUS_KEYS, type ProjectDetail, type ProjectSearchRequest, type ProjectSearchResponse} from '@heritagemonitor/shared'
import type {FastifyInstance} from 'fastify'
import {getProjectById, searchProjects} from './projects.service.js'

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

// Ajv's `coerceTypes` (on by default in Fastify) turns a single `?only=123`
// into `["123"]`, so callers never have to special-case one value vs. the
// repeated `?only=1&only=2` form.
const stringArrayProp = {type: 'array', items: {type: 'string'}} as const

export async function projectsRoutes(fastify: FastifyInstance) {
    // ProjectSearchRequest (from @heritagemonitor/shared) is the TS type for
    // this querystring; the JSON schema below stays hand-written because it is
    // what drives Fastify/Ajv's runtime coercion — a transport concern the
    // shared zod schema does not need to duplicate.
    fastify.get<{Querystring: ProjectSearchRequest}>(
        '/projects/search',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        q: {type: 'string'},
                        c: {type: 'string', enum: [...CORPUS_KEYS]},
                        // No maximum here: the last reachable page is a fact of
                        // the index's result window, so the 400 for a page past
                        // it comes from common/search/runSearch.ts with a
                        // message that says so.
                        page: {type: 'integer', minimum: 1, default: 1},
                        sort: {type: 'string', enum: ['relevance', 'budget']},
                        only: stringArrayProp,
                    },
                },
            },
        },
        async (request): Promise<ProjectSearchResponse> => searchProjects(request.query),
    )

    fastify.get<{Params: ByIdParams}>(
        '/projects/:id',
        {schema: {params: {type: 'object', properties: {id: {type: 'string'}}, required: ['id']}}},
        async (request): Promise<ProjectDetail> => getProjectById(request.params.id),
    )
}
