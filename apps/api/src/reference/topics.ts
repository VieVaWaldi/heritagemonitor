import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import type {ProjectTopic} from '@heritagemonitor/shared'

// The OpenAlex topic hierarchy (4,516 rows), exported alongside the indexes by
// hm_pipeline (`export/sql/topics.sql` -> `api/topics.json`). The indexes store
// bare ids (`topic_id`, `subfield_id`, `field_id`, `domain_id`) — a facet
// bucket or a project detail is unreadable without this table, and joining it
// per request from OpenSearch would be a second round trip for static data.
//
// Reference data, not a domain module: it is read by whichever module needs a
// label (projects today, experts/minorities/the topic modal later), owned by
// none of them.

interface TopicRow {
    id: string
    subfield_id: string
    field_id: string
    domain_id: string
    topic_name: string
    subfield_name: string
    field_name: string
    domain_name: string
}

// Read once at startup, not per request — the table is static for the
// process's lifetime. Resolved relative to this file (not cwd) so it works
// both under `tsx` (from src/) and in the built image (from dist/, where the
// build script copies the .json alongside — see package.json's postbuild).
const rows: TopicRow[] = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'topics.json'), 'utf-8'))

const topicsById = new Map<string, TopicRow>(rows.map((row) => [row.id, row]))

/** The four hierarchy names for a project's `topic_id`, or null when unknown. */
export function topicOf(topicId: string | null | undefined): ProjectTopic | null {
    if (!topicId) return null
    const row = topicsById.get(topicId)
    if (!row) return null
    return {
        topic_name: row.topic_name,
        subfield_name: row.subfield_name,
        field_name: row.field_name,
        domain_name: row.domain_name,
    }
}

/** `{topicId: name}` for the ids given — for labelling facet buckets. */
export function topicNames(topicIds: Iterable<string>): Record<string, string> {
    const labels: Record<string, string> = {}
    for (const id of topicIds) {
        const row = topicsById.get(id)
        if (row) labels[id] = row.topic_name
    }
    return labels
}

export function topicCount(): number {
    return topicsById.size
}
