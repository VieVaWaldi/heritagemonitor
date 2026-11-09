import {CORPUS_KEYS, EXPORT_FORMATS, type ProjectExportRequest, type WorkExportRequest} from '@heritagemonitor/shared'
import type {FastifyInstance} from 'fastify'
import {projectSearchQueryProperties} from '../projects/projects.routes.js'
import {streamProjectExport, streamWorkExport} from './exports.service.js'

// Transport layer for the /search download. The querystrings are the search
// routes' own params (an export is the same search, unpaginated), minus
// `page`/`sort`, plus the format and the export-only toggles.
//
// The handlers `return reply`: the service has already called reply.send()
// with a stream, and returning the reply makes Fastify wait for that stream
// instead of treating the resolved handler as "nothing was sent".

// Each export scans up to EXPORT_MAX_ROWS documents, so far fewer per client
// than the global default.
const exportRateLimit = {max: 10, timeWindow: '10 minutes'}

const formatProp = {type: 'string', enum: [...EXPORT_FORMATS]} as const
const stringArrayProp = {type: 'array', items: {type: 'string'}} as const

const {page: _page, sort: _sort, ...projectFilterProperties} = projectSearchQueryProperties

export async function exportsRoutes(fastify: FastifyInstance) {
    fastify.get<{Querystring: ProjectExportRequest}>(
        '/projects/export',
        {
            config: {rateLimit: exportRateLimit},
            schema: {
                querystring: {
                    type: 'object',
                    required: ['format'],
                    properties: {
                        ...projectFilterProperties,
                        format: formatProp,
                        excludeTranslated: {type: 'boolean'},
                        includeTopic: {type: 'boolean'},
                    },
                },
            },
        },
        async (request, reply) => {
            await streamProjectExport(request.query, reply)
            return reply
        },
    )

    // Mirrors works.routes.ts's /works/search querystring, minus page/sort.
    fastify.get<{Querystring: WorkExportRequest}>(
        '/works/export',
        {
            config: {rateLimit: exportRateLimit},
            schema: {
                querystring: {
                    type: 'object',
                    required: ['format'],
                    properties: {
                        q: {type: 'string'},
                        c: {type: 'string', enum: [...CORPUS_KEYS]},
                        years: {type: 'string'},
                        oa: stringArrayProp,
                        language: stringArrayProp,
                        publisher: stringArrayProp,
                        project: stringArrayProp,
                        org: stringArrayProp,
                        minority: stringArrayProp,
                        only: stringArrayProp,
                        strict: {type: 'string', enum: ['true']},
                        format: formatProp,
                    },
                },
            },
        },
        async (request, reply) => {
            await streamWorkExport(request.query, reply)
            return reply
        },
    )
}
