# packages/shared is a compiled package, not a Just-in-Time one.
# api (tsx, NodeNext ESM) and web (Next.js/Turbopack) each apply
# different resolution rules to raw TS, and Turbopack currently can't
# transpile a workspace package's source correctly (open upstream bug). So
# instead of either app importing src/ directly, this container just runs
# `tsc --watch` and both other containers import the compiled dist/ output
# via the same bind-mounted host folder.

# Build context is the monorepo root (see docker-compose.yml) so pnpm can see
# the workspace root manifests, same reasoning as apps/api's Dockerfile.

FROM node:24-alpine

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install

COPY packages/shared packages/shared

WORKDIR /app/packages/shared

CMD ["pnpm", "run", "dev"]
