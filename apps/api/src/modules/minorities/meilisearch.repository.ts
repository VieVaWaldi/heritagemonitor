import {client, indices} from '@heritagemonitor/search2'

// Repository layer: raw Meilisearch access only, no business logic (query
// building, DTO mapping) — that lives in minorities.service.ts.

export interface MinoritiesSearchParams {
    q: string
    filter?: string[]
    facets?: string[]
    attributesToSearchOn?: string[]
    limit: number
    offset: number
}

export async function search({q, filter, facets, attributesToSearchOn, limit, offset}: MinoritiesSearchParams) {
    return client.index(indices.minoritiesIndexName).search(q, {
        filter,
        facets,
        attributesToSearchOn,
        limit,
        offset,
    })
}

export async function getById(qid: string) {
    return client.index(indices.minoritiesIndexName).getDocument(qid)
}
