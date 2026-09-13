// Thin wrapper around fetch — the one place web/ knows how to reach api/.
// Every module-level api call should go through this, not call
// fetch directly, so the base url and error handling change in one place.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
    ) {
        super(message)
        this.name = 'ApiError'
    }
}

// Structurally matches Zod's schema shape without depending on zod directly —
// callers pass a schema (from @heritagemonitor/shared) to validate the
// response at this network boundary before the rest of the app trusts it.
interface Parser<T> {
    parse(data: unknown): T
}

export async function apiGet<T>(path: string, schema: Parser<T>, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers)
    headers.set('X-Request-Id', crypto.randomUUID())

    const response = await fetch(`${API_BASE_URL}${path}`, {...init, headers})

    if (!response.ok) {
        throw new ApiError(`GET ${path} failed with status ${response.status}`, response.status)
    }

    return schema.parse(await response.json())
}
