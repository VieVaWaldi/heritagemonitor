import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import type {FacetValue} from '@heritagemonitor/shared'

// The 3,000 most common publishers, exported alongside the indexes by
// hm_pipeline (`export/sql/publishers.sql` -> `api/publishers.json`).
//
// Held in memory because the alternative is an aggregation over 50M works:
// the works index has no facets at all for that reason (see
// packages/search/src/query/works.ts), and a publisher menu still has to be
// searchable. The counts are corpus-wide, not counts under the user's current
// query — the UI says so, since pretending otherwise would need the
// aggregation this exists to avoid.

interface PublisherRow {
    publisher: string
    works: number
}

// Read once at startup. Resolved relative to this file (not cwd) so it works
// under `tsx` (from src/) and in the built image (from dist/, where the build
// script copies the .json alongside — see package.json's postbuild).
const rows: PublisherRow[] = JSON.parse(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'publishers.json'), 'utf-8'),
)

// Lower-cased once, so a keystroke costs one pass over an array rather than
// 3,000 `toLowerCase()` calls.
const searchable = rows.map((row) => ({...row, needle: row.publisher.toLowerCase()}))

/**
 * Publishers whose name contains `q`, most published first. An empty query
 * returns the top of the list, which is what an opened menu should show.
 */
export function searchPublishers(q: string, limit: number): FacetValue[] {
    const needle = q.trim().toLowerCase()
    const matches = needle ? searchable.filter((row) => row.needle.includes(needle)) : searchable
    return matches.slice(0, limit).map((row) => ({value: row.publisher, label: row.publisher, count: row.works}))
}

export function publisherCount(): number {
    return rows.length
}
