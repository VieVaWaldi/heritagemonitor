import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import type {ProjectTopic, TopicTreeNode} from '@heritagemonitor/shared'
import type {SearchableTopicNode} from './topicSearch.js'

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

/** The subfield and field a leaf topic sits under, for rolling counts up. */
export function topicAncestors(topicId: string): {subfield_id: string; field_id: string} | null {
    const row = topicsById.get(topicId)
    return row ? {subfield_id: row.subfield_id, field_id: row.field_id} : null
}

export function topicCount(): number {
    return topicsById.size
}

/**
 * The hierarchy as a tree: field > subfield > topic. The `domain` level is
 * left out on purpose — four buckets that nobody filters by, costing a click.
 *
 * Built once and frozen: it is the same 4,516 rows for the life of the
 * process, and every request would otherwise rebuild ~600 arrays.
 */
const tree: TopicTreeNode[] = buildTree()

function buildTree(): TopicTreeNode[] {
    const fields = new Map<string, TopicTreeNode>()
    const subfields = new Map<string, TopicTreeNode>()

    for (const row of rows) {
        let field = fields.get(row.field_id)
        if (!field) {
            field = {id: row.field_id, name: row.field_name, level: 'field', children: []}
            fields.set(row.field_id, field)
        }

        let subfield = subfields.get(row.subfield_id)
        if (!subfield) {
            subfield = {id: row.subfield_id, name: row.subfield_name, level: 'subfield', children: []}
            subfields.set(row.subfield_id, subfield)
            field.children.push(subfield)
        }

        subfield.children.push({id: row.id, name: row.topic_name, level: 'topic', children: []})
    }

    const byName = (a: TopicTreeNode, b: TopicTreeNode) => a.name.localeCompare(b.name)
    for (const subfield of subfields.values()) subfield.children.sort(byName)
    for (const field of fields.values()) field.children.sort(byName)
    return [...fields.values()].sort(byName)
}

export function topicTree(): TopicTreeNode[] {
    return tree
}

/** Every node of every level, flattened — what the name search runs over. */
const searchableNodes: SearchableTopicNode[] = buildSearchableNodes()

function buildSearchableNodes(): SearchableTopicNode[] {
    const nodes: SearchableTopicNode[] = []
    for (const field of tree) {
        nodes.push({id: field.id, name: field.name, level: 'field', fieldId: null, fieldName: null, subfieldId: null, subfieldName: null})
        for (const subfield of field.children) {
            nodes.push({
                id: subfield.id,
                name: subfield.name,
                level: 'subfield',
                fieldId: field.id,
                fieldName: field.name,
                subfieldId: null,
                subfieldName: null,
            })
            for (const topic of subfield.children) {
                nodes.push({
                    id: topic.id,
                    name: topic.name,
                    level: 'topic',
                    fieldId: field.id,
                    fieldName: field.name,
                    subfieldId: subfield.id,
                    subfieldName: subfield.name,
                })
            }
        }
    }
    return nodes
}

export function topicSearchNodes(): readonly SearchableTopicNode[] {
    return searchableNodes
}

/**
 * The leaf topic ids under a set of fields/subfields.
 *
 * Needed where an index stores only leaf topics: `minorities.topic_ids` has no
 * field or subfield column, so "everything in Archaeology" has to become the
 * list of its topics before it can be filtered on.
 */
export function leafTopicIds({fields = [], subfields = []}: {fields?: string[]; subfields?: string[]}): string[] {
    if (fields.length === 0 && subfields.length === 0) return []
    const fieldSet = new Set(fields)
    const subfieldSet = new Set(subfields)

    const ids: string[] = []
    for (const row of rows) {
        if (fieldSet.has(row.field_id) || subfieldSet.has(row.subfield_id)) ids.push(row.id)
    }
    return [...new Set(ids)]
}
