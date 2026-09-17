import cors from '@fastify/cors'
import Fastify, {LogController} from 'fastify'
import {healthRoutes} from "./modules/health/health.routes.js";
import {llmchatRoutes} from "./modules/llmchat/llmchat.routes.js";
import {minoritiesRoutes} from "./modules/minorities/minorities.routes.js";
import {monitoringRoutes} from "./modules/monitoring/monitoring.routes.js";
import foundation from './plugins/foundation.js'
import {buildLoggerOptions} from './plugins/logging.js'
import {genReqId} from './plugins/requestId.js'

const fastify = Fastify({
    logger: buildLoggerOptions(),
    genReqId,
    logController: new LogController({disableRequestLogging: true}),
    // api's port is never published to the host in prod. Caddy is the only
    // thing that can reach it, over Docker's internal network, so trusting
    // its X-Forwarded-* headers is safe and needed for correct client IPs/proto.
    trustProxy: true,
})

await fastify.register(cors, {
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(','),
})

// Must be registered before /v1 below — Fastify's register() creates an
// encapsulation scope, so anything foundation decorates wouldn't be visible
// to v1 routes if it were registered inside that block instead.
await fastify.register(foundation)

// All versioning lives here, not in each module's own route file
fastify.register(async (v1) => {
    v1.register(healthRoutes)
    v1.register(monitoringRoutes)
    v1.register(llmchatRoutes)
    v1.register(minoritiesRoutes)
}, {prefix: '/v1'})

const start = async () => {
    try {
        // 0.0.0.0, not localhost — required so the container's port mapping can reach it.
        await fastify.listen({port: 3001, host: '0.0.0.0'})
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}

start()