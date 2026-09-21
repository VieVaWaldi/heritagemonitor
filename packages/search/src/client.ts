import {Client} from '@opensearch-project/opensearch'

// Reads the same OPENSEARCH_* vars infra/docker-compose.yml already defines.
// apps/api's Dockerfile/compose service must pass these through as env vars.
// Security is disabled for local dev (plugins.security.disabled=true in
// docker-compose.yml), so auth is only wired up when credentials are actually
// present — prod sets these once plugins.security.disabled=false there.
export const client = new Client({
    node: `http://${process.env.OPENSEARCH_HOST ?? 'opensearch'}:${process.env.OPENSEARCH_PORT ?? 9200}`,
    ...(process.env.OPENSEARCH_USERNAME && process.env.OPENSEARCH_PASSWORD
        ? {auth: {username: process.env.OPENSEARCH_USERNAME, password: process.env.OPENSEARCH_PASSWORD}}
        : {}),
})
