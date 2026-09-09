# Plugins

`/plugins` is for cross-cutting concerns every route gets.
Everything here is registered once in `src/index.ts`, before the `/v1` prefix.

## Viewing logs & monitoring data

Every request produces one JSON line (`type: "request"`) with `route`, `statusCode`,
`durationMs`, `bytesSent`. To read it directly:

`docker compose logs` always prefixes every line with `hm-api  | `, which breaks `jq` —
add `--no-log-prefix` whenever piping into it. The container's stdout also isn't *only*
Pino JSON — `tsx watch`/npm print their own plain-text lines (startup banner, "Debugger
listening on...") interleaved with it — so `jq` (strict JSON) needs those filtered out
first with `grep '^{'`; `pino-pretty` doesn't need this, it passes non-JSON lines through
untouched.

- Tail live: `docker compose -f infra/docker-compose.yml logs -f --no-log-prefix api`
- Since a given time: `docker compose -f infra/docker-compose.yml logs --no-log-prefix --since 1h api`
- Pretty-print: `docker compose -f infra/docker-compose.yml logs --no-log-prefix api | pnpm --filter @heritagemonitor/api exec pino-pretty`
  (not `npx pino-pretty` — pnpm workspaces don't hoist deps to the root `node_modules`, so
  run from the repo root that resolves nothing local and falls back to fetching from the
  registry, which can silently hang/fail depending on network.
- Just the request-log lines: `... --no-log-prefix api | grep '^{' | jq 'select(.type=="request")'`
- Export a range for offline analysis (e.g. computing percentiles later):
  `docker compose -f infra/docker-compose.yml logs --no-color --no-log-prefix --since 24h api > api.log`
- On the real VM (Docker running natively, not Docker Desktop), the files also sit
  directly on disk, find the path with `docker inspect --format='{{.LogPath}}' hm-api`.

### Monitoring User Proxy

Count requests in a window (`--since` is a Go duration — no `d` unit, so 30 days is
`720h`):

  ```bash
  docker compose -f infra/docker-compose.yml logs --no-log-prefix --since 1h api | grep '^{' | jq -c 'select(.type=="request")' | wc -l
  docker compose -f infra/docker-compose.yml logs --no-log-prefix --since 24h api | grep '^{' | jq -c 'select(.type=="request")' | wc -l
  docker compose -f infra/docker-compose.yml logs --no-log-prefix --since 720h api | grep '^{' | jq -c 'select(.type=="request")' | wc -l
  ```

Caveat: log rotation (below) caps each container at ~30MB total. Once real traffic
produces more than that within 30 days, the oldest lines are already gone and the 30-day
count will silently undercount — revisit the rotation limits or export/archive logs
regularly once that's a risk.

## Log levels

Pino's six levels, least → most verbose. `LOG_LEVEL` shows that level and everything more
severe — lower level = more logs.

- `fatal` — process is about to crash because of this
- `error` — something failed, needs attention (our 500s log here)
- `warn` — handled but unexpected (our 4xx `AppError`s log here)
- `info` — normal operational events (server start, the per-request line) — default
- `debug` — diagnostic detail for local development
- `trace` — everything, including framework internals — noisiest

Set via `LOG_LEVEL` in `infra/.env` (currently `trace`, so nothing is filtered).

## Log rotation

Per-service `logging:` blocks in `infra/docker-compose.yml`, using Docker's `json-file`
driver: `max-size: 10m` rotates the active log file once it hits 10MB, `max-file: 3` keeps
at most 3 rotated files and drops the oldest beyond that.

## Request lifecycle

1. `genReqId` (`requestId.ts`) assigns the request id — trusts an `X-Request-Id` header
   from the client if it looks like a UUID, otherwise generates one.
2. CORS (`@fastify/cors`, registered in `index.ts`)
3. `foundation.ts`, in order: compression (`@fastify/compress`, gzip/deflate only — no
   brotli, its better ratio isn't worth the extra CPU here), error handler + 404 handler
   (`errors.ts`), auth placeholder (`auth.ts`), request-log hook (`requestLog.ts`), cache
   decorator (`cache.ts`)
4. Per-route schema validation (Ajv, via each route's Fastify schema option)
5. Route handler
6. `onResponse`: the structured request-log line fires here specifically because
   `reply.elapsedTime` only has a meaningful value once the response has been sent —
   earlier hooks would always see 0
7. Reply sent

## Cache

--- Cache is still WIP ---

`cache.ts` exports a small `Cache` interface (`get`/`set`/`del`) and `InMemoryCache`.
Services should take a `Cache` as a constructor/factory argument rather than importing
the decorator directly, so they stay testable without mocking a module.

`maxEntries` (default 1000) is the memory cap: once full, the oldest-inserted key is evicted
to make room for a new one. It's a cap on entry *count*, not bytes, so it's a
rough proxy. Configure it via `CACHE_MAX_ENTRIES` (env, default 1000).

@Walter & @Claude: Keep this in mind when adding APIs for deckgl.

That count-cap assumes small per-entry payloads (a list page, a single record) — it holds
for a paginated ≤100-doc list view. It does *not* hold for something like a filterable
map-view endpoint returning up to ~100k `[id, [lat, lon]]` rows: a handful of cached
filter-variations there could be several MB each, so "capped at 1000 entries" wouldn't mean
what it sounds like. A large-payload endpoint like that should get its own `InMemoryCache`
with a much smaller `maxEntries` (or skip caching — high filter cardinality likely means a
low hit rate anyway), not reuse the default instance's assumptions.

## Monitoring

--- Monitoring is still WIP ---

No prom-client/`/metrics` endpoint. Its counters/histograms live in-process and reset on
every restart — including every `tsx watch` reload in dev. The request-log line above is
the raw source of truth instead; percentiles get computed from it later, with whatever
bucketing makes sense at the time. A live `/metrics` endpoint is still a reasonable
*addition* later if there's ever a need for live ops dashboards and something to scrape it
— not a replacement for this.

**`reqId` is not a user id.** It's per-request — a new one gets generated (or trusted from
`X-Request-Id`) on every single call, purely to trace one request through the logs. It
can't be used to count unique users, and right now there is no field in the log that could
be — no per-user dimension exists yet at all.

**Unique users** aren't tracked yet — counting total requests from the log is enough for
now. When that's needed: `web` should issue a first-party random-UUID cookie and forward it
to `api` as `X-Anon-Id` per request, rather than `api` setting the cookie itself — `web`'s
browser code calls `api` cross-origin, so a cookie set by `api` would need
`SameSite=None; Secure` plus CORS `credentials: true`, which is needless fragility next to
a same-origin cookie forwarded as a plain header.

**Client-perceived response time** isn't tracked either — that needs instrumentation in
`apps/web`'s `apiClient.ts`, not anything on the api side.

## Auth

@Walter & @Claude: Before we add Auth we will add simple non-authorized rate limiting
(maybe cookie based or something)

--- Just a placeholder, not built ---

`auth.ts` decorates `request.user = null` and exports a stub `requireAuth` preHandler that
currently just 501s. It's a marked seam, not real logic — see the TODO comment in that
file.
