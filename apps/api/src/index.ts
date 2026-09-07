import cors from '@fastify/cors'
import Fastify from 'fastify'
import {healthRoutes} from "./modules/health/health.routes.js";

const fastify = Fastify({
    logger: true,
})

await fastify.register(cors, {
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(','),
})

// All versioning lives here, not in each module's own route file
fastify.register(async (v1) => {
    v1.register(healthRoutes)
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