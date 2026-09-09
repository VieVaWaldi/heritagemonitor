import {randomUUID} from 'node:crypto'
import type {IncomingMessage} from 'node:http'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Trusts a client-supplied X-Request-Id only if it looks like a UUID, so a
// malformed/oversized header can't get logged verbatim on every line for
// the request's lifetime. Falls back to generating our own.
export function genReqId(req: IncomingMessage): string {
    const header = req.headers['x-request-id']
    const value = Array.isArray(header) ? header[0] : header

    return value && UUID_PATTERN.test(value) ? value : randomUUID()
}
