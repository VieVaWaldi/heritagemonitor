# Simple single-stage build for now.

# pnpm needs to see the workspace root (pnpm-workspace.yaml, pnpm-lock.yaml)
# plus that package's source to resolve a `workspace:*` dependency.

# Hot reload: docker-compose.yml mounts apps/web and packages/shared into
# their real paths under /app at runtime. Next.js's dev server watches files
# itself, same as tsx watch does for the API.

FROM node:24-alpine

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# Copy workspace manifests first so `pnpm install` is cached unless
# dependencies change. Only web and its workspace dependency (shared) need to
# be present — pnpm only sees packages that actually exist in the build context.
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install

# Now copy the actual source (used for the initial image build only —
# at runtime the compose volume mounts take over, see note above).
COPY apps/web apps/web
COPY packages/shared packages/shared

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["pnpm", "run", "dev:debug"]
