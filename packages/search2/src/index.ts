import {Meilisearch} from 'meilisearch'

// Meant to replace @heritagemonitor/search (OpenSearch) once the migration
// happens — see infra/README.md's Meilisearch section. Not wired into
// apps/api yet: nothing passes MEILISEARCH_HOST/PORT/MEILI_MASTER_KEY
// through to a service's environment block, so these defaults only match
// infra/docker-compose.yml's `meilisearch` service reached from *inside* the
// Docker network (its real internal port, 7700 — not the host-published
// MEILISEARCH_PORT from infra/.env, same host-vs-container split as
// OPENSEARCH_PORT/POSTGRES_PORT).
export const client = new Meilisearch({
    host: `http://${process.env.MEILISEARCH_HOST ?? 'meilisearch'}:${process.env.MEILISEARCH_PORT ?? 7700}`,
    apiKey: process.env.MEILI_MASTER_KEY,
})

export * as indices from './indices/index.js'
