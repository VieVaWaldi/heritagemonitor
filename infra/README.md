# Infra

Local (and eventually prod) orchestration and data layer for HeritageMonitor.
Api, Web, Shared Types, Postgres & OpenSearch run via Docker Compose.
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

## DB Web UIs

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

# More documentation

## Data persistence

Data lives in two named Docker volumes: `pg-data`, `os-data`. These are NOT inside this
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

The `shared` service has no exposed ports and does nothing but `tsc --watch` `packages/shared` — `api` and `web`
both wait on its healthcheck (`dist/index.js` exists) before starting. See `packages/shared/README.md` for why it's
a separate container instead of each app compiling it themselves.

## Host machine requirements (before first run)

@Walter When setting up on prod for the first time do some research on whats actually needed here HW wise.

These are OS-level settings Docker Compose cannot set for you. Run once per machine
(and re-check after a host reboot — some of these don't persist automatically).

### `vm.max_map_count` (Linux only, required for OpenSearch)

OpenSearch/Lucene needs a higher limit than the Linux default (65530) or it will
fail to start.

```bash
sudo sysctl -w vm.max_map_count=262144
```

This resets on reboot unless made persistent:

```bash
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```

Not needed on macOS/Windows Docker Desktop, the setting applies inside the Linux VM
Docker Desktop manages, which is usually pre-configured high enough. Verify with
`docker compose logs opensearch` if OpenSearch fails to start — this is the most common
first-boot failure.

### `memlock` / `nofile` ulimits

Already handled inside `docker-compose.yml` via the `ulimits:` block on the
`opensearch` service (`memlock: unlimited`, `nofile: 65536`) — nothing to do
on the host for local dev.

### JVM heap size (`OPENSEARCH_JAVA_OPTS`)

Set in `docker-compose.yml`, currently `-Xms1g -Xmx1g` — sized for local dev.

**Do not use this value for the Draco HPC deployment.** Production/HPC nodes should use
something like `-Xms16g -Xmx16g` (or whatever fits half the node's available RAM — never
more than 50%, per OpenSearch's own guidance). When we get to that deployment, override
this via a separate `docker-compose.prod.yml` (or `docker-compose.override.yml`) rather
than editing the base file, so dev and prod don't fight each other.