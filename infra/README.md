# Infra

Local (and eventually prod) orchestration and data layer for HeritageMonitor.
Postgres + OpenSearch run via Docker Compose. This folder only orchestrates containers, no app code lives here.

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

## Data persistence

Data lives in two named Docker volumes: `pg-data`, `os-data`. These are NOT inside this
repo folder, they live in Docker's own storage area. `docker compose down` does not
touch them. Only `docker compose down -v`, or manually running `docker volume rm`, deletes
them.

## Docker Gotchas

The POSTGRES_PORT: 5432 is hardcoded deliberately, not ${POSTGRES_PORT}. POSTGRES_PORT in .env is the
host-published port (what we use to reach Postgres via localhost:5432). But inside Docker's internal network,
containers always talk to each other on Postgres's actual internal port, 5432, regardless of what we've mapped it to on
the host. Reusing the same variable for both would be wrong the moment we ever change the hosts port mapping.

This is the important distinction to internalize: drizzle.config.ts connects via localhost, while src/index.ts's runtime
client connects via postgres (the API container, talking to another container).

## Web UIs (planned)

Evaluating lightweight DB/search browsers for local inspection — not yet added to compose:

- Postgres: CloudBeaver or pgAdmin
- OpenSearch: OpenSearch Dashboards, or a REST client (Postman/Insomnia) against `:9200`

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