# Frontend

## Code quality

- `pnpm lint` — ESLint
- `pnpm format` — Prettier (run from repo root)
- `tsc --noEmit` — type check

## Translations

Source strings live in `/modules/**/messages/en.json` (one per module + common).

WIP: A future script globs that pattern to generate other locale files via LLM.

## Debugging

Default enabled with script: `dev:debug`

_WebStorm one-time setup:_

1. Run → Edit Configurations → + → Attach to Node.js/Chrome
2. Host: localhost, Port: 9231
3. Check 'Reconnect automatically'
4. Add Remote URL
    1. Select web directory: apps/web
    2. Replace Remote URL with: file:///app/apps/web
5. Set a breakpoint in a server side stuff (Need a chrome DevTools debugger for actual client side debug)
    1. --> YEAH sorry, but gotta edit/ save the file once for the debugger to work, ie add 1 nop and save
6. docker compose up -d (starts the container with the inspector listening), then run the WebStorm debug config to
   attach
7. Hit the relevant page/route in the browser — breakpoint should catch

_Gotchas:_

- **Port is 9231, not 9230.** `next dev` (Turbopack) spawns a separate render-worker process that actually executes
  your pages/components — it is NOT the process `NODE_OPTIONS='--inspect=0.0.0.0:9230'` attaches to. Next.js itself
  bumps the inspector port by one for that worker and prints which one to use:
    ```
    Debugger listening on ws://0.0.0.0:9230/...   ← next dev CLI process, not where your code runs
    Debugger listening on ws://0.0.0.0:9231/...   ← the actual render worker
    - Debugger port: 9231
    ```
  Check `docker compose logs web` if breakpoints ever silently stop hitting after a Next.js upgrade — this offset
  isn't guaranteed to stay `+1` forever. Both 9230 and 9231 are published in `infra/docker-compose.yml`.
- This inspector reaches code that runs **on the server** — Server Components, Route Handlers, middleware, data
  fetching. Client Components (`"use client"`) still execute once server-side too, for the initial HTML — but hook
  logic that only runs client-side (`useEffect`, event handlers, re-renders from state updates) never touches Node
  at all and needs regular browser devtools instead.
- **Breakpoint doesn't catch on the very first hit after attaching?** Turbopack compiles each route on demand, the
  first time it's requested — that first compile can race the debugger session still syncing up, so a breakpoint's
  URL pattern doesn't match yet. Save the file once (a no-op edit is fine) to force a recompile with the session
  already attached, then reload — it binds correctly and stays bound after that, even across further edits.
- Next.js's dev server recompiles and reloads on save, same as `tsx watch` on the API side — this can drop the
  debugger connection. Tick "Reconnect automatically" in the Attach config.
- This uses `--inspect`, not `--inspect-brk` — the process doesn't pause on boot, so attach before triggering the
  code path you want to hit (a stale connection after a reload won't catch code that already ran).
- If breakpoints show up hollow/unbound, check the path mapping: container path `/app/apps/web` ↔ local path
  `apps/web`.
