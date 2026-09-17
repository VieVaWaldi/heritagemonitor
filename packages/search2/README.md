# Packages: Meilisearch

Client for the `meilisearch` dev container (see `infra/README.md`'s Meilisearch section). Meant to
eventually replace `packages/search` (OpenSearch) — kept as a separate package rather than added to
`packages/search` while both exist side by side during the migration.

Status: scaffolding only. Not built by the `libs` Docker service and not consumed by `apps/api` yet —
add it to `infra/Dockerfile.libs`, `infra/build-libs.sh` and `infra/docker-compose.yml`'s `libs`/`api`
services once there's an actual connector using it.

## ORM

No ORM — using the official `meilisearch` client, same reasoning as `packages/search`.
