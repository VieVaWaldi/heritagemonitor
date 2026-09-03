import Fastify from 'fastify'

const fastify = Fastify({
    logger: true,
})

// Temporary health check — proves the server boots and Docker networking works.
// Will move into its own module once real routes exist (see RULES.md: "Keep routes in modules").
fastify.get('/health', async () => {
    return {status: 'ok'}
})

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