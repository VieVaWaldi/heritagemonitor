#!/bin/sh
# Runs `pnpm run dev` (tsc --watch) for every pure-TS workspace library that
# apps/api and apps/web import compiled dist/ output from, not raw src/. 
# One container, three watchers, so api/web only wait on one healthcheck 
# instead of three separate services.
set -e

trap 'kill 0' TERM INT

(cd packages/shared && pnpm run dev) &
(cd packages/db && pnpm run dev) &
(cd packages/search && pnpm run dev) &

wait
