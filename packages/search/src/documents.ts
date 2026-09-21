import {client} from './client.js'

// Document lookups by id, shared by every module that has an id in hand
// (a detail panel, a project's organisations tab, a work's projects tab).
// They sit here rather than in each api module's repository because the one
// thing they encode is an OpenSearch client quirk, not domain logic: the
// generated response types get `hits.hits`/`docs`'s element type wrong (an
// operator-precedence bug, see apps/api's health repository note), so the
// casts belong in one place.

interface GetResponse<T> {
    found?: boolean
    _id: string
    _source?: T
}

interface MgetResponse<T> {
    docs: Array<{_id: string; found?: boolean; _source?: T}>
}

/** One document's `_source`, or null when it does not exist. */
export async function getDocument<T>(index: string, id: string): Promise<T | null> {
    try {
        const {body} = await client.get({index, id})
        const response = body as unknown as GetResponse<T>
        return response._source ?? null
    } catch (error) {
        // The client throws on 404 rather than returning found: false.
        if (isNotFound(error)) return null
        throw error
    }
}

/**
 * Several documents at once, **in the order the ids were given** (OpenSearch
 * already guarantees this for `_mget`, but callers rely on it — e.g.
 * coordinators first in a project's organisation list — so it is stated and
 * tested here). Missing documents are dropped, not returned as holes.
 */
export async function mgetDocuments<T>(index: string, ids: string[], source?: readonly string[]): Promise<T[]> {
    if (ids.length === 0) return []
    const {body} = await client.mget({
        index,
        body: {ids},
        ...(source ? {_source: [...source] as string[]} : {}),
    })
    const response = body as unknown as MgetResponse<T>
    return response.docs.map((doc) => doc._source).filter((doc): doc is T => doc != null)
}

function isNotFound(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'statusCode' in error && (error as {statusCode: unknown}).statusCode === 404
}
