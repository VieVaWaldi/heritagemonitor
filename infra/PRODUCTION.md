# Production setup

Server nickname: **DIGICHerVM**.

What was built, configured, and verified to get `heritagemonitor` running in production.
Backups: `packages/db/README.md`. Retiring the old app: `~/SUNSET_DIGICHER.md`.

## Quick build & run (local, just to see the prod stack work)

```bash
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod up -d --build  # build + start the prod stack
docker compose -f infra/docker-compose.prod.yml ps                                        # check health status
docker compose -f infra/docker-compose.prod.yml logs -f                                   # follow logs (all services)
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod down           # stop (add -v to also wipe pg-data-prod/os-data-prod)
```

## Architecture

See `~/README.md` for the full operational rundown.

```
Internet → HTTPS reverse proxy (institutional, TLS) → this VM → Caddy (only container
    publishing a host port) → /v1/* → api, everything else → web
    → postgres, opensearch (internal Docker network / loopback only, never external)
```

## WIP Reverse proxy (`docker-compose.prod.yml` only, doesn't exist in the dev file)

`web` and `api` are two separate containers on their own internal ports (3000/3001), but a
production host only has *one* externally-reachable port to give them. A `caddy` service is
the one thing that publishes a host port in prod — everything else (`web`, `api`, and even
`postgres`/`opensearch`, which only get a `127.0.0.1`-only mapping for tooling/tunnel access)
is reachable exclusively over Docker's internal network.

Caddy dispatches by path *shape*, not a specific version — `infra/Caddyfile`'s
`path_regexp ^/v[0-9]+(/|$)` sends anything looking like `/v1/...`, `/v2/...` etc. to `api`,
everything else to `web`. That means shipping a future API version never requires touching
the Caddyfile — versioning stays entirely `api`'s own concern (its `/v1` prefix in
`apps/api/src/index.ts`), invisible to the proxy.

Side effect worth knowing: since the browser only ever talks to one origin through Caddy,
CORS is no longer needed for real traffic in prod (still registered on the api for any
direct/non-proxied access, just not what makes the actual site work).

These are OS-level settings Docker Compose cannot set. Done once on the actual prod
VM already (see below for exactly what), re-check after any host reboot that isn't via
Docker's own auto-restart.

## WIP `vm.max_map_count` (Linux only, required for OpenSearch)

OpenSearch/Lucene needs a higher limit than the Linux default (65530) or it will fail to
start. Done persistently via `/etc/sysctl.d/99-opensearch.conf` on the prod VM (not the
manual `sysctl -w` + `tee -a /etc/sysctl.conf` this section used to suggest — a dedicated
file in `/etc/sysctl.d/` is the cleaner, more standard way to do this on a modern
systemd/Rocky box):

```
vm.max_map_count=262144
vm.swappiness=1
```

`vm.swappiness=1` rides along in the same file — OpenSearch should essentially never be
swapped (a swapped heap page turns into a multi-second GC pause on spinning disk), and this
keeps the kernel from reaching for swap eagerly even before `bootstrap.memory_lock` (below)
locks the heap in RAM outright.

Verify with `sysctl vm.max_map_count vm.swappiness`, or `docker compose logs opensearch` if
OpenSearch fails to start — this is the most common first-boot failure.

## WIP `memlock` / `nofile` ulimits

The `ulimits:` block on the `opensearch` service (`memlock: unlimited`, `nofile: 65536`) is
necessary but **not sufficient on its own** — found the hard way on the actual prod VM.
Docker's own daemon has its *own* `LimitMEMLOCK`, and a compose-level `ulimits:` block can
never grant a container more than the daemon itself is allowed. The prod VM's Docker daemon
had `LimitMEMLOCK` capped at 8MB by default — with that in place, `bootstrap.memory_lock:
true` would have silently failed to actually lock the heap (no hard error, just an
`Unable to lock JVM memory` line buried in the logs) even though the container-level
`ulimits:` block looked completely correct. Fixed via a systemd drop-in on the *host's*
`docker.service`:

```ini
# /etc/systemd/system/docker.service.d/limits.conf
[Service]
LimitMEMLOCK=infinity
```

Then `sudo systemctl daemon-reload && sudo systemctl restart docker`. Confirm with
`systemctl show docker.service -p LimitMEMLOCK` (should read `infinity`) — this is a
one-time host setting, not something `docker-compose.prod.yml` can express on its own.

## WIP JVM heap size (`OPENSEARCH_JAVA_OPTS`) — real numbers, load-tested

Dev (`docker-compose.yml`) stays `-Xms1g -Xmx1g`, sized for a laptop. Prod
(`docker-compose.prod.yml`) uses:

```
OPENSEARCH_JAVA_OPTS=-Xms10g -Xmx10g
mem_limit: 23g          # the container's own cgroup limit, NOT the JVM heap flag
```

**23g container limit for a 10g heap, not ~12g** — this number was originally guessed at 14g
(back when the heap was 12g: heap + a little JVM overhead) and corrected after checking cgroup v2 semantics specifically:
under cgroup v2, page cache for files a container reads is charged against *that container's
own* `memory.max`, not some free-floating host-wide pool the way it would be for a bare-metal
process. A tightly-capped container gets none of the page-cache benefit that makes Lucene
fast on a slow disk — the container needs real headroom *above* the heap, inside its own
limit, specifically so that headroom is available as page cache. [Confirmed at Phase 3]
`plugins.security.disabled=false` + `plugins.security.ssl.http.enabled=false` genuinely
works — auth is required (basic auth, `admin` + `OPENSEARCH_INITIAL_ADMIN_PASSWORD`), but the
REST layer stays plain HTTP rather than switching to a self-signed HTTPS cert, since this is
purely an internal Docker-network hop anyway (Caddy/the Omni Proxy already handle real
external TLS). `packages/search/src/index.ts`'s client only adds `auth` when
`OPENSEARCH_USERNAME`/`OPENSEARCH_PASSWORD` are actually set, so dev (no security) is
unaffected.

**Update 2026-09-21: heap 12g -> 10g, container 24g -> 23g, api 1g -> 1536m.** The VM smoke
run peaked at 6.5 GiB heap used, so 10g is still comfortable, and the api now holds reference
data in memory (topics, publishers, an org table of about 494k rows, blank-page caches), so it
gets its RAM from OpenSearch (`mem_limit: 1536m`, `NODE_OPTIONS=--max-old-space-size=1152`).
Host budget: caddy 128m + web 768m + api 1536m + postgres 512m + opensearch 23g is about
25.9 GB of the 31 GB VM.


## WIP Shard plan for the real dataset — decided, not yet implemented

@Walter Update these docs once we start with sharding -> But this should probably point to 
`packages/search/README.md `

`packages/search/src/indices` only has `health.ts` today — the real `publications` /
`projects` / `organizations` indices don't exist yet (waiting on the ingestion pipeline,
separate work). Settings to use when they're built, single-node so no distribution benefit,
but shards still matter for **parallelism across this box's 8 cores** — one shard = one
thread per query, regardless of node count — and for keeping any one Lucene index within a
sane size for merge/GC/recovery time:

* `publications` (~100M docs, largest by far): 8 primary shards
* `projects` (~4M docs): 2 primary shards
* `organizations` (~400k docs): 1 primary shard
* **`number_of_replicas: 0` on all of them** — a replica with nowhere else to live (single
  node) just sits permanently unassigned and keeps cluster status stuck yellow for no benefit
* HDD-specific index settings (this box's storage is spinning disk, not SSD):
  `index.merge.scheduler.max_thread_count: 1` (the default assumes SSD), `index.codec:
  best_compression`, `index.refresh_interval: 30s` normally / `-1` during a bulk load,
  `index.translog.flush_threshold_size: 1gb` (fewer, larger segments)
* Field-level, once the real mappings exist: `index: false` on fields never queried,
  `norms: false` on fields that are filtered/aggregated but never relevance-scored — both cut
  disk and heap for zero functional loss

---

# Documentation from setting up Prod 

~ Maybe this ll help us find bugs faster

## Host-level setup

- Docker daemon needed its own outbound-proxy config (a systemd drop-in) — the daemon does
  not inherit a user's shell proxy settings, and images can't be pulled without it
- `LimitMEMLOCK=infinity` on the Docker daemon itself (another systemd drop-in) — a container
  `ulimits:` block can never grant more than the daemon's own limit allows; without this,
  OpenSearch's `bootstrap.memory_lock` would silently fail to actually lock its heap
- `vm.max_map_count=262144` and `vm.swappiness=1` (`/etc/sysctl.d/`) — OpenSearch/Lucene
  needs the former to start at all; the latter keeps the kernel from swapping OpenSearch's
  heap, which would turn into multi-second GC pauses on this box's spinning disk
- Node 24 installed via nvm, used explicitly (`nvm use 24`) rather than as a shell default —
  matches how this host already handled Node version switching before this project
- Docker's own client-side proxy config (`~/.docker/config.json`) — separate from the daemon
  config above, needed specifically for `corepack`/`pnpm install` steps *during* image builds

## Repo changes

- Root `package.json` added (pins the package manager version, forces one shared
  `typescript` version across every workspace package)
- `packages/db` and `packages/search` given a real build step (compiled `dist/`, matching
  `packages/shared`'s existing pattern) — they had none before, which would have silently
  broken at runtime in production (only worked in dev because of how `tsx` resolves raw `.ts`)
- Production `Dockerfile.prod` for `api` and `web` — multi-stage, no dev dependencies, no
  bind mounts (app code and the Caddy config are baked into images, not mounted)
- `infra/docker-compose.prod.yml` — standalone file, not a merged override of the dev compose
  file (Compose can't cleanly *subtract* dev's bind mounts via a merge)
- `apps/api/src/plugins/noStore.ts` — every api response now sends `Cache-Control: no-store`,
  added after a stale cached response cost real debugging time (see gotchas below)
- `.gitignore` gap fixed — `infra/.env.prod` (real secrets) wasn't actually covered by any
  pattern before this pass

## Gotchas worth remembering

- **Docker's modern builder (BuildKit) silently drops proxy build-args unless the Dockerfile
  itself declares `ARG HTTP_PROXY` etc.** — a global Docker proxy config alone isn't enough
- **Node's native `fetch` ignores `HTTP_PROXY` entirely unless `NODE_USE_ENV_PROXY=1` is
  set** — this is what `corepack` uses internally; without it, builds fail behind a proxy
  with no useful error pointing at the actual cause
- **`NEXT_PUBLIC_*` env vars bake into the client bundle at build time, not read from the
  container later** — setting one via `docker-compose`'s `environment:` block (correct for
  `next dev`) silently does nothing for a production build
- **A doubled API path prefix (`/v1/v1/...`) still gets routed to the right service and 404s
  there** — looked exactly like upstream caching at first; only directly hitting the API URL
  (bypassing the frontend's own code) separated "network/caching problem" from "app bug"
- **Docker's proxy auto-injection sets both `HTTP_PROXY` and `http_proxy`** — blanking only
  one leaves a proxy-aware client (Caddy's Go HTTP client, specifically) still routing
  internal container-to-container calls out through an external proxy that can't resolve them
- **A plain `pg_dump` has no `DROP`-before-`CREATE` guards** — restoring into a database that
  still has the same schema (the realistic recovery scenario) throws "already exists" and
  duplicate-key errors on everything instead of actually restoring. Needs `--clean --if-exists`.

## Verified, not just built

- **A real reboot** — the entire stack came back healthy via Docker alone
  (`restart: unless-stopped` + the daemon starting on boot), zero manual steps
- **~29,000 requests** load-tested (including a 60s sustained burst), zero errors, memory
  flat under sustained load rather than climbing
- **Backup → restore**, full round trip, confirmed clean

## One known, unresolved issue

Docker's port-publish for the shared public port intermittently failed silently during
testing — container reported started, but nothing was actually listening on the host side,
no error anywhere. Reproduced live and had it simply work cleanly on a retry with no config
changes in between — behaves like a race condition, not a deterministic conflict. Root cause
not confirmed. In practice: `hm-switch.sh new` already rolls back safely if this happens
again — just retry it.

