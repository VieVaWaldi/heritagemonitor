# @heritagemonitor/shared

Shared TS types and Zod schemas used by both `apps/api` and `apps/web`.

`apps/api` (tsx/NodeNext) and `apps/web` (Turbopack) need conflicting conventions to import raw TypeScript directly,
so instead of picking one, this package gets compiled: `docker compose` runs a `libs` service that
`tsc --watch`es it (and `packages/db`, `packages/search` — same reasoning) into `dist/`, and both apps only ever
import that compiled output, never `src/` directly.

Outside Docker: `pnpm --filter @heritagemonitor/shared build` (or `run dev` to watch).
