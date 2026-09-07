import {Client} from '@opensearch-project/opensearch'

// Reads the same OPENSEARCH_* vars infra/docker-compose.yml already defines.
// apps/api's Dockerfile/compose service must pass these through as env vars.
// Security is disabled for local dev (plugins.security.disabled=true in
// docker-compose.yml), so no auth is configured here — revisit once a real
// deployment turns it back on.
export const client = new Client({
    node: `http://${process.env.OPENSEARCH_HOST ?? 'opensearch'}:${process.env.OPENSEARCH_PORT ?? 9200}`,
})

export * as indices from './indices/index.js'
