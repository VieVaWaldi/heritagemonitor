import type {HealthCheckResponse} from '@heritagemonitor/shared'
import type {FastifyInstance} from 'fastify'
import {checkHealth} from './health.service.js'

// Transport layer: HTTP concerns only, no business logic here. See RULES.md
// rule 9 (plain functions over controller classes) and rule 14 (modules own
// their own routes).

export async function healthRoutes(fastify: FastifyInstance) {
    fastify.get('/health', async (): Promise<HealthCheckResponse> => {
        return checkHealth()
    })
}
