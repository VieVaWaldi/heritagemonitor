import {CORPUS_KEYS} from '@heritagemonitor/shared'
import cors from '@fastify/cors'
import Fastify, {LogController} from 'fastify'
import {registerDefaultPageWarmUp, registerWarmUp, runWarmUp} from './common/search/warmUp.js'
import {demoRoutes} from "./modules/demo/demo.routes.js";
import {expertsRoutes} from "./modules/experts/experts.routes.js";
import {fundingRoutes} from "./modules/funding/funding.routes.js";
import {grantsRoutes} from "./modules/grants/grants.routes.js";
import {healthRoutes} from "./modules/health/health.routes.js";
import {llmchatRoutes} from "./modules/llmchat/llmchat.routes.js";
import {minoritiesRoutes} from "./modules/minorities/minorities.routes.js";
import {monitoringRoutes} from "./modules/monitoring/monitoring.routes.js";
import {organisationsRoutes} from "./modules/organisations/organisations.routes.js";
import {projectsRoutes} from "./modules/projects/projects.routes.js";
import {topicsRoutes} from "./modules/topics/topics.routes.js";
import {worksRoutes} from "./modules/works/works.routes.js";
import {getFundingMap} from "./modules/funding/funding.service.js";
import {searchGrants} from "./modules/grants/grants.service.js";
import {searchOrganisations} from "./modules/organisations/organisations.service.js";
import {searchProjects} from "./modules/projects/projects.service.js";
import {searchWorks} from "./modules/works/works.service.js";
import foundation from './plugins/foundation.js'
import {startOrganisationTableLoad} from './reference/organisationTable.js'
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
    // Fastify's default is 100 characters, which is shorter than a funding
    // stream id: those are the path through the funding hierarchy
    // (`funder::programme::action`), and the longest in the index is 323
    // characters once percent-encoded. 512 leaves room without turning a
    // route param into an unbounded input.
    maxParamLength: 512,
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
    v1.register(projectsRoutes)
    v1.register(organisationsRoutes)
    v1.register(worksRoutes)
    v1.register(topicsRoutes)
    v1.register(expertsRoutes)
    v1.register(grantsRoutes)
    v1.register(fundingRoutes)
    v1.register(demoRoutes)
}, {prefix: '/v1'})

// The blank default page of each searchable entity, per corpus (plan F0-12).
// The funding map has no route yet; when it gets one it registers its own
// warm-up from its module, and nothing here changes.
registerDefaultPageWarmUp('projects', searchProjects)
registerDefaultPageWarmUp('organisations', searchOrganisations)
registerDefaultPageWarmUp('works', searchWorks)
registerDefaultPageWarmUp('grants', searchGrants)

// The funding map is the heaviest first paint in the app — a 500-bucket
// aggregation over every matching project, and the default tab of
// /search/funding. Warmed per corpus so the first visitor does not pay for it.
for (const corpus of CORPUS_KEYS) {
    registerWarmUp({name: `funding-map:${corpus}`, run: () => getFundingMap({c: corpus})})
}

const start = async () => {
    try {
        // 0.0.0.0, not localhost — required so the container's port mapping can reach it.
        await fastify.listen({port: 3001, host: '0.0.0.0'})
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }

    // Deliberately NOT awaited: both are optimisations, and the api must serve
    // requests from the moment it listens. Until the table is loaded, callers
    // fall back to fetching from the index; until the cache is warm, the first
    // visitor pays for their own page. Neither can fail the process.
    void startOrganisationTableLoad((message) => fastify.log.info(message))
        .then(() => runWarmUp({info: (m) => fastify.log.info(m), warn: (m) => fastify.log.warn(m)}))
        .catch((error: unknown) => fastify.log.warn(`start-up warm-up failed: ${String(error)}`))
}

start()