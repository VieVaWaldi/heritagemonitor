import {randomUUID} from 'node:crypto'
import {client, indices} from '@heritagemonitor/search2'

// Repository layer: raw data access only, no business logic.

interface HealthCheckDocument {
    id: string
    message: string
    createdAt: string
}

export async function getLatestHealthCheck() {
    await indices.ensureHealthIndex(client)

    const {hits} = await client.index<HealthCheckDocument>(indices.healthIndexName).search('', {
        sort: ['createdAt:desc'],
        limit: 1,
    })

    return hits[0] ?? null
}

export async function insertHealthCheck(message: string) {
    await indices.ensureHealthIndex(client)

    const document: HealthCheckDocument = {id: randomUUID(), message, createdAt: new Date().toISOString()}

    // addDocuments only enqueues the write — wait for it so the very next
    // read (including this same health check's own getLatestHealthCheck
    // fallback) is guaranteed to see it, same reasoning as
    // indices/health.ts's ensureHealthIndex.
    await client.index<HealthCheckDocument>(indices.healthIndexName).addDocuments([document]).waitTask()

    return document
}
