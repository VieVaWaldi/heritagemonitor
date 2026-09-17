# Infra

Orchestration and data layer for HeritageMonitor.
Api, Web, Shared Types, Postgres & OpenSearch run via Docker Compose, as well as tools.
This folder only orchestrates containers, no app code lives here.

## Everyday commands

```bash
# Start everything in the background
docker compose up -d # Use --build when you updated package.json or Dockerfile

# Check status, both should eventually show "healthy"
docker compose ps

# Follow logs (all services, or one)
docker compose logs -f
docker compose logs -f opensearch

# Stop containers, KEEP data volumes (safe — data survives)
docker compose down

# Stop containers AND DELETE data volumes (destructive — wipes Postgres + OpenSearch data)
docker compose down -v

# Restart a single service
docker compose restart postgres
```

## Dev Tooling

### DB Web UIs

Two optional admin UIs, gated behind the `tools` Compose profile.

```bash
# Start everything, core services + both UIs
docker compose --profile tools up -d

# Or add the UIs to an already-running stack
docker compose --profile tools up -d dbgate opensearch-dashboards
```

* **DbGate** http://localhost:5600: Postgres UI client.
* **OpenSearch Dashboards** http://localhost:5601: OpenSearch UI Client 

Notes:
* Discover needs an **index pattern** before it'll show a given OpenSearch index (Dashboards
  Management → Index Patterns), unlike DbGate, indices don't just appear as browsable tables.
  Dev Tools (`GET <index>/_search`) works immediately with no setup, if you just want a quick look.
* Both containers keep their own state in named volumes (`dbgate-data`, and Dashboards' own indices
  live inside `os-data` alongside the app's real OpenSearch data)
* Local dev only, these images are not part of the prod deployment ... yet?

### Meilisearch (dev only)

`meilisearch` starts with everything else via a plain `docker compose up -d` — it's not behind the
`tools` profile. Host-reachable at `localhost:${MEILISEARCH_PORT:-7701}` (internally the container
still listens on Meilisearch's default `7700`, same host-vs-container split as Postgres/OpenSearch
above). Auth is on via `MEILI_MASTER_KEY` in `infra/.env`.

This is dev-only for now: no entry in `docker-compose.prod.yml`, and nothing in `apps/api` or
`apps/web` talks to it yet — it's just standing the container up.

## Data persistence

Data lives in three named Docker volumes: `pg-data`, `os-data`, `meili-data`. These are NOT inside this
repo folder, they live in Docker's own storage area. `docker compose down` does not
touch them. Only `docker compose down -v`, or manually running `docker volume rm`, deletes
them.

## Docker Gotchas

`POSTGRES_PORT: 5432` on the `postgres` service is hardcoded, not `${POSTGRES_PORT}` — that env var is only the
*host*-published port (`localhost:${POSTGRES_PORT}`, e.g. `5433`, deliberately not `5432` to avoid colliding with a
locally-installed Postgres). Containers always reach each other on Postgres's real internal port, `5432`, regardless
of the host mapping. Same distinction: `drizzle.config.ts` connects via `localhost`, `packages/db`'s runtime client
connects via `postgres` (container-to-container).

Same pattern again on the `api` service for OpenSearch: `OPENSEARCH_PORT: 9200` is hardcoded (OpenSearch's real
internal port), while `${OPENSEARCH_PORT}` in `infra/.env` is only the host-published port. `OPENSEARCH_HOST` is
passed through as `opensearch` (the container/service name), same as `POSTGRES_HOST`.

The `libs` service has no exposed ports and does nothing but `tsc --watch` every pure-TS workspace package
(`shared`, `db`, `search`) — `api` and `web` both wait on its healthcheck (all three `dist/index.js` exist) before
starting. `db` and `search` need this too, not just `shared`: their `package.json` `exports` point at compiled
`dist/` output, same as `shared`, because `apps/api`'s prod image runs plain `node dist/index.js` — it can't resolve
an `exports` map pointing at raw `.ts` source the way `tsx` (dev only) can. See `packages/shared/README.md` for the
original reasoning on why this is a separate container instead of each app compiling it themselves.

`api`'s and `web`'s `node_modules` (and `web`'s `.next`) are anonymous volumes, not bind mounts — they live in
Docker's storage, decoupled from the host. After `pnpm add`ing a dependency, a plain `docker compose up -d --build`
can still serve the *old* volume's contents (works fine right after `docker compose down`, since that actually
removes them) and error with "Module not found" despite the image having rebuilt correctly. Add `-V`
(`--renew-anon-volumes`) to force it: `docker compose up -d --build -V <service>`.