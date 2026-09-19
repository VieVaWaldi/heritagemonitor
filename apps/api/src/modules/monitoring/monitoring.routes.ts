import {
    type MonitoredRoutesResponse,
    monitoredRoutesResponseSchema,
    type RecentRequestsResponse,
    recentRequestsResponseSchema,
    type RequestCountResponse,
    type RequestTimeSeriesResponse,
    requestTimeWindowSchema,
} from '@heritagemonitor/shared'
import type {FastifyInstance} from 'fastify'
import {
    getRequestCountByRoute,
    getRequestTimeSeries,
    listMonitoredRoutes,
    listRecentRequests,
} from './monitoring.service.js'

interface RequestTimeQuery {
    route?: string
    window: string
}

interface RequestCountQuery {
    window: string
}

export async function monitoringRoutes(fastify: FastifyInstance) {
    fastify.get<{ Querystring: RequestTimeQuery }>('/monitoring/request-time', {
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    // The fastify route pattern (e.g. "GET /v1/health"), not a
                    // raw path, omit to get every tracked route merged.
                    route: {type: 'string'},
                    window: {type: 'string', enum: requestTimeWindowSchema.options},
                },
                required: ['window'],
            },
        },
    }, async (request): Promise<RequestTimeSeriesResponse> => {
        const {route, window} = request.query
        // Ajv already restricted `window` to requestTimeWindowSchema.options above.
        const buckets = getRequestTimeSeries(route ?? null, window as RequestTimeSeriesResponse['window'])
        return {route: route ?? null, window: window as RequestTimeSeriesResponse['window'], buckets}
    })

    fastify.get('/monitoring/routes', async (): Promise<MonitoredRoutesResponse> => {
        return monitoredRoutesResponseSchema.parse({routes: listMonitoredRoutes()})
    })

    fastify.get<{ Querystring: RequestCountQuery }>('/monitoring/request-count', {
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    window: {type: 'string', enum: requestTimeWindowSchema.options},
                },
                required: ['window'],
            },
        },
    }, async (request): Promise<RequestCountResponse> => {
        const {window} = request.query
        const counts = getRequestCountByRoute(window as RequestCountResponse['window'])
        return {window: window as RequestCountResponse['window'], counts}
    })

    fastify.get('/monitoring/recent-requests', (): RecentRequestsResponse => {
        return recentRequestsResponseSchema.parse({requests: listRecentRequests()})
    })
}
