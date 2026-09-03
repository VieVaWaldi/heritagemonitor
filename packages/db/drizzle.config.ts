import {defineConfig} from 'drizzle-kit'

// This file is used by `drizzle-kit generate` / `drizzle-kit migrate`, run from
// your host machine (not inside Docker) — so it connects via localhost, using
// the port infra/docker-compose.yml publishes to your host.
export default defineConfig({
    dialect: 'postgresql',
    schema: './src/schema.ts',
    out: './migrations',
    dbCredentials: {
        host: 'localhost',
        port: Number(process.env.POSTGRES_PORT ?? 5432),
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB!,
    },
})
