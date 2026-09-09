import type {FastifyServerOptions} from 'fastify'

// Configures Fastify's built-in Pino logger from env. Always raw JSON — never
// pretty-printed at the source, dev included, so stdout stays jq-able. Pipe
// through `pino-pretty` for human reading instead (see plugins/README.md).
export function buildLoggerOptions(): FastifyServerOptions['logger'] {
    return {
        level: process.env.LOG_LEVEL ?? 'info',
        redact: ['req.headers.authorization', 'req.headers.cookie'],
    }
}
