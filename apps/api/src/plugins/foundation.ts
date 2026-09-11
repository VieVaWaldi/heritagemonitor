import compress from '@fastify/compress'
import type {FastifyInstance} from 'fastify'
import fp from 'fastify-plugin'
import {registerAuthPlaceholder} from './auth.js'
import {InMemoryCache} from './cache.js'
import {registerErrorHandling} from './errors.js'
import {registerNoStore} from './noStore.js'
import {registerRequestLog} from './requestLog.js'

declare module 'fastify' {
    interface FastifyInstance {
        cache: InMemoryCache
    }
}

// Cross-cutting concerns every route should get. Wrapped with fastify-plugin
// so its decorators/hooks are visible outside this plugin's own scope.
// Must be registered before the /v1 prefix in index.ts.
async function foundation(fastify: FastifyInstance) {
    await fastify.register(compress, {encodings: ['gzip', 'deflate']})

    registerErrorHandling(fastify)
    registerAuthPlaceholder(fastify)
    registerRequestLog(fastify)
    registerNoStore(fastify)

    const maxCacheEntries = Number(process.env.CACHE_MAX_ENTRIES) || undefined
    fastify.decorate('cache', new InMemoryCache(maxCacheEntries))
}

export default fp(foundation)
