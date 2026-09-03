# Simple single-stage build for now — fine for a solo dev project.
# Revisit with a multi-stage build (using `turbo prune` or similar) once this
# monorepo has more shared packages and build times start to hurt.
#
# Hot reload: docker-compose.yml mounts ../apps/api into /app at runtime, and
# CMD runs `tsx watch`, so editing a file on the host restarts the process
# inside the container automatically — no rebuild needed for source changes.
# You only need `docker compose build api` again when package.json changes.

FROM node:24-alpine

# corepack ships with Node itself — this just activates pnpm, no separate
# install step, and pins the version so builds stay reproducible.
RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# Copy manifest first so `pnpm install` is cached unless dependencies change.
COPY package.json ./
RUN pnpm install

# Now copy the actual source (used for the initial image build only —
# at runtime the compose volume mount takes over, see note above).
COPY . .

EXPOSE 3001

CMD ["pnpm", "run", "dev:debug"]