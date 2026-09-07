import type {Client} from '@opensearch-project/opensearch'

// index name + mapping live together here as our own hand-rolled "schema",
// one file per index. Mirroring how packages/db/src/schema does it for Postgres tables.

export const healthIndexName = 'health_checks'

const healthIndexMapping = {
    mappings: {
        properties: {
            message: {type: 'text'},
            createdAt: {type: 'date'},
        },
    },
} as const

export async function ensureHealthIndex(client: Client) {
    const {body: exists} = await client.indices.exists({index: healthIndexName})
    if (exists) return

    await client.indices.create({
        index: healthIndexName,
        body: healthIndexMapping,
    })
}
