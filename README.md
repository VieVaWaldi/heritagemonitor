# HeritageMonitor

HM is a research platform. It is structured as a monorepo with a Next.js frontend, a Node.js/Fastify backend, uses
OpenSearch as a research data search engine and Postgres for every other kind of data.

For orchestration of the apps and docker services go to [Infra](infra/README.md).

## First-time setup && After updating packages

```bash
cp infra/.env.example infra/.env
# then edit infra/.env and set real values

pnpm install
# Uses pnpm-workspace.yaml to discover all package.json and start all node_module installs

docker compose -f infra/docker-compose.yml up -d --build
# To start the build process
```

## Quick Sanity Checks

* Node http://localhost:3001/health
* Web http://localhost:3000
* OpenSearch http://localhost:9200/
* Postgres `docker exec -it hm-postgres psql -U hm_admin -d hm_db -c "SELECT version();"`

## Structure

```
root/
├── apps/
│   ├── web/        ← Next.js App (frontend)
│   └── api/        ← Node.js Fastify (backend)
├── packages/
│   ├── db/         ← Postgres schema + ORM Drizzle client 
│   ├── search/     ← OpenSearch client + index mappings
│   ├── shared/     ← shared TS types, Zod validation schemas, utility functions
│   └── config/     ← shared eslint/tsconfig config
├── infra/
│   └── docker-compose.yml       ← Postgres + OpenSearch, local dev
├── package.json                 ← workspace root
└── pnpm-workspace.yaml
```

## Simple Rules

1. Everything always fully TypeScript
2. Follow Clean scalable Architecture
    1. Full-Stack: [Full-Stack Tao]
    2. Node (api/): [Tao of Node](apps/api/RULES.md)
    3. React (web/): [Tao of React](apps/web/RULES.md)
3. API routes are versioned (/v1, /v2 on breaking changes). DB schema is NOT versioned this way, it evolves via
   migrations only.
4. Labor division: web/ returns pages (HTML/React), api/ returns JSON only. web/ never talks to Postgres/OpenSearch
   directly — it always goes through api/.
5. Always format code (Webstorm OPTION+SIHFT+F) and always optimize imports (Webstorm OPTION+SIHFT+O)
