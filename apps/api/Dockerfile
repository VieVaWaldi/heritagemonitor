# Simple single-stage build for now.
#
# pnpm needs to see the workspace root (pnpm-workspace.yaml, pnpm-lock.yaml)
# plus the dependenies packages' source to resolve `workspace:*` dependencies.
#
# Hot reload: docker-compose.yml mounts apps/api, packages/db, packages/search
# and packages/shared into their real paths under /app at runtime, and CMD
# runs `tsx watch`, so editing a file on the host restarts the process inside
# the container automatically.

FROM node:24-alpine

# Needed when built on a proxy-restricted network (prod VM). 
# Harmless elsewhere (e.g. a laptop with unrestricted internet).
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG http_proxy
ARG https_proxy
ARG no_proxy
# Node's native fetch (which corepack uses internally) ignores HTTP_PROXY/
# HTTPS_PROXY entirely unless this is set, see apps/api/Dockerfile.prod.
ARG NODE_USE_ENV_PROXY=1

# corepack ships with Node itself — this just activates pnpm, no separate
# install step, and pins the version so builds stay reproducible.
RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# Copy workspace manifests first so `pnpm install` is cached unless
# dependencies change. Only api and its workspace dependencies (db, search,
# shared) need to be present. pnpm only sees packages that actually exist in
# the build context.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/search/package.json packages/search/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install

# Now copy the actual source (used for the initial image build only.
# At runtime the compose volume mounts take over, see note above).
COPY apps/api apps/api
COPY packages/db packages/db
COPY packages/search packages/search
COPY packages/shared packages/shared

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["pnpm", "run", "dev:debug"]
