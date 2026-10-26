# Backend

## Logging, middleware & monitoring

See [src/plugins/README.md](src/plugins/README.md).

## Caching

Two unrelated things, both called "cache":

- **`plugins/cache.ts`** (`fastify.cache`) — an in-process `Map` with TTLs, 
  decorated onto every route. Opt-in: nothing calls it unless a route explicitly does
  `fastify.cache.get()/.set()`. Single-process only, if `api` ever runs
  multiple replicas, each gets its own separate cache.
- **`plugins/noStore.ts`** sends `Cache-Control: no-store` on *every* response, globally,
  telling any client or proxy never to cache a response and reuse it later. Unrelated to the
  above; this is about external HTTP caching, not the api's own internal one.

`no-store` being global is correct today (nothing here benefits from caching), but it'll need
to become per-route once a genuinely cacheable endpoint exists — e.g. a work detail
view, safe to cache for a day+ given the dataset only refreshes monthly. For that kind of
route, prefer actively invalidating `fastify.cache` when the ingestion pipeline loads new data
over guessing a TTL, and consider a permissive header (`Cache-Control: public, max-age=...`)
instead of `no-store` — letting an upstream proxy cache a response means a repeat request
might never reach this VM at all, which beats even a fast in-memory hit.

## Debugging

Default enabled with script: `dev:debug`

*WebStorm one-time setup:*

1. Run → Edit Configurations → + → Attach to Node.js/Chrome
2. Host: localhost, Port: 9229
3. Check 'Reconnect automatically'
4. Add Remote URL
    1. Select api directory: apps/api
    2. Replace Remote URL with: file:///app/apps/api
5. Set a breakpoint
6. docker compose up -d (starts container with the inspector listening), then run the WebStorm debug config to attach
7. Hit http://localhost:3001/v1/health — breakpoint should catch if placed inside that handler

*Gotchas:*

- You do **not** need to stop the Docker container and run the API natively to debug it. The container already
  starts with `--inspect=0.0.0.0:9229` (see the `dev:debug` script) and `infra/docker-compose.yml` publishes port
  9229 to the host — WebStorm attaches to the already-running container, no local process needed.
- `tsx watch` restarts the whole process on every file save, which drops the debugger connection. Tick "Reconnect
  automatically" in the Attach config so you don't have to manually re-attach after each edit.
- This uses `--inspect`, not `--inspect-brk` — the process does not pause on boot, so you won't catch code that only
  runs once at startup/import unless you attach first and then trigger a restart (save any file so `tsx watch`
  restarts it). Breakpoints inside route handlers are unaffected, since those only run per-request.
- If breakpoints show up hollow/unbound, check the path mapping in the run config: container path `/app/apps/api`
  ↔ local path `apps/api`. WebStorm usually infers this correctly on its own since the repo's folder layout is
  identical on both sides (that's what the compose volume mount preserves).

