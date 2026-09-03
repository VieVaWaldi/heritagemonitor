import {drizzle} from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

// Reads the same POSTGRES_* vars infra/docker-compose.yml already defines.
// apps/api's Dockerfile/compose service must pass these through as env vars.
const connectionString = `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST ?? 'postgres'}:${process.env.POSTGRES_PORT ?? 5432}/${process.env.POSTGRES_DB}`

const client = postgres(connectionString)

export const db = drizzle(client, {schema})
export {schema}