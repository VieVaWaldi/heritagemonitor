import {config} from 'dotenv'
import {defineConfig} from 'drizzle-kit'


// This file is used by `drizzle-kit generate` / `drizzle-kit migrate`, run from
// your host machine. So it connects via localhost, using the port
// infra/docker-compose.yml publishes to your host.

// infra/.env (dev) or infra/.env.prod is the single source of truth for these
// values (same file Docker Compose reads) — loaded explicitly here since it
// lives outside this package's own folder and Drizzle Kit doesn't
// auto-discover it there. Picked by NODE_ENV so `pnpm db:migrate` stays
// zero-friction in dev and `NODE_ENV=production pnpm db:migrate` targets prod.
config({path: process.env.NODE_ENV === 'production' ? '../../infra/.env.prod' : '../../infra/.env'})

export default defineConfig({
    dialect: 'postgresql',
    // Points at every file in the folder (excluding index.ts's own re-exports —
    // Drizzle Kit reads the actual table definitions directly, not through the
    // barrel file apps/api imports from). See packages/README.md.
    schema: './src/schema/*',
    out: './migrations',
    dbCredentials: {
        host: 'localhost',
        port: Number(process.env.POSTGRES_PORT ?? 5433),
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB!,
    },
})