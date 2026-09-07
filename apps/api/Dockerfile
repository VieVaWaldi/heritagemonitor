# Simple single-stage build for now. Revisit with a multi-stage build
# (using `turbo prune` or similar) once build times start to hurt.

# pnpm needs to see the workspace root (pnpm-workspace.yaml, pnpm-lock.yaml)
# plus the dependenies packages' source to resolve `workspace:*` dependencies.

# Hot reload: docker-compose.yml mounts apps/api, packages/db, packages/search
# and packages/shared into their real paths under /app at runtime, and CMD
# runs `tsx watch`, so editing a file on the host restarts the process inside
# the container automatically.

FROM node:24-alpine

# corepack ships with Node itself — this just activates pnpm, no separate
# install step, and pins the version so builds stay reproducible.
RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# Copy workspace manifests first so `pnpm install` is cached unless
# dependencies change. Only api and its workspace dependencies (db, search,
# shared) need to be present. pnpm only sees packages that actually exist in
# the build context.
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/search/package.json packages/search/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install

# Now copy the actual source (used for the initial image build only —
# at runtime the compose volume mounts take over, see note above).
COPY apps/api apps/api
COPY packages/db packages/db
COPY packages/search packages/search
COPY packages/shared packages/shared

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["pnpm", "run", "dev:debug"]
