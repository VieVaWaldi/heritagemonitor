# Simple single-stage build for now — matches apps/api's approach.
# Hot reload: docker-compose.yml mounts ../apps/web into /app at runtime.
# Next.js's dev server watches files itself, same as tsx watch does for the API.

FROM node:24-alpine

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

COPY package.json ./
RUN pnpm install

COPY . .

EXPOSE 3000

CMD ["pnpm", "run", "dev:debug"]