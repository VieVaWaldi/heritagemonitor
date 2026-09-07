import {client, indices} from '@heritagemonitor/search'

// Repository layer: raw data access only, no business logic.

interface HealthCheckDocument {
    message: string
    createdAt: string
}

// The client's generated types get `hits.hits`'s element type wrong (an
// operator-precedence bug: `Hit & {_source?: T}[]` parses as
// `Hit & ({_source?: T}[])`, not `(Hit & {_source?: T})[]`, so indexing loses
// `_id`) — cast to what the OpenSearch REST API actually returns.
interface HealthCheckHit {
    _id: string
    _source?: HealthCheckDocument
}

export async function getLatestHealthCheck() {
    await indices.ensureHealthIndex(client)

    const {body} = await client.search({
        index: indices.healthIndexName,
        body: {
            size: 1,
            sort: [{createdAt: 'desc'}],
        },
    })

    const hits = body.hits.hits as unknown as HealthCheckHit[]
    const hit = hits[0]
    if (!hit?._source) return null

    return {id: hit._id, ...hit._source}
}

export async function insertHealthCheck(message: string) {
    const document: HealthCheckDocument = {message, createdAt: new Date().toISOString()}

    const {body} = await client.index({
        index: indices.healthIndexName,
        body: document,
        refresh: true, // small, low-traffic index — safe to force it visible to the very next search
    })

    return {id: body._id, ...document}
}
