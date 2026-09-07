import {drizzle} from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'

// Reads the same POSTGRES_* vars infra/docker-compose.yml already defines.
// apps/api's Dockerfile/compose service must pass these through as env vars.
const client = postgres({
    host: process.env.POSTGRES_HOST ?? 'postgres',
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
})

export const db = drizzle(client, {schema})
export {schema}
