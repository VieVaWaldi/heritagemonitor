import type {Meilisearch} from 'meilisearch'

// index name + settings live together here as our own hand-rolled "schema",
// one file per index. Mirrors packages/search's indices/health.ts (which
// mirrors packages/db/src/schema for Postgres tables).

export const healthIndexName = 'health_checks'

export async function ensureHealthIndex(client: Meilisearch) {
    const exists = await client.getIndex(healthIndexName).catch(() => null)
    if (exists) return

    // createIndex only enqueues the task — index creation happens
    // asynchronously, so a get/search issued right after would still 404
    // without waiting for it to actually finish.
    await client.createIndex(healthIndexName, {primaryKey: 'id'}).waitTask()
    // Sorting by an attribute 404s/400s unless it's explicitly declared
    // sortable first — unlike OpenSearch, Meilisearch doesn't infer this from
    // a document's shape alone.
    await client.index(healthIndexName).updateSortableAttributes(['createdAt']).waitTask()
}
