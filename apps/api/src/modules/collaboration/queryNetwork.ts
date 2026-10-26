import type {NetworkNode} from '@heritagemonitor/shared'
import type {NetworkOrganisation} from './network.js'

// The pure part of the query network: pair counting, the ranking-respecting
// cap and the payload. No I/O, so every rule can be tested on its own (see
// apps/api/test/queryNetwork.test.ts).

/** One scanned project, in ranking order: only what pairs need. */
export interface ScannedProject {
    /** Coordinators first — the index writes `org_ids` that way (see projects.service). */
    orgIds: readonly string[]
}

/** More organisations than this on one project are ignored: a 300-partner consortium is 45,000 pairs and says little about who works with whom. */
export const MAX_ORGS_PER_PROJECT = 30

interface Pair {
    a: string
    b: string
    /** Shared projects. */
    weight: number
    /** Sum over the pair's projects of (scanned - position): the ranking tie-break. */
    rankScore: number
}

interface Institution {
    key: string
    /** Every record id seen for it, the first one represents it. */
    ids: string[]
    projects: number
}

export interface PairCounts {
    pairs: Pair[]
    institutions: Map<string, Institution>
}

/**
 * Counts the pairs of INSTITUTIONS that share a project.
 *
 * Each project's organisation ids are folded to institutions first (plan D19:
 * records sharing a `name_key` are one institution), so a project listing an
 * institution under two ids does not pair it with itself, and the same pair
 * under two ids is one edge. Projects with fewer than two institutions add
 * nothing. Only the first MAX_ORGS_PER_PROJECT are used.
 *
 * `scanned` is the size of the ranking window: the project at position `i`
 * contributes `scanned - i` to the rank score of each pair it holds.
 */
export function countPairs(
    projects: readonly ScannedProject[],
    organisations: ReadonlyMap<string, NetworkOrganisation>,
    scanned: number,
): PairCounts {
    const institutions = new Map<string, Institution>()
    const pairs = new Map<string, Pair>()

    projects.forEach((project, position) => {
        const keys: string[] = []
        for (const id of project.orgIds.slice(0, MAX_ORGS_PER_PROJECT)) {
            const organisation = organisations.get(id)
            // An id with no record cannot be named.
            if (!organisation) continue
            const key = organisation.nameKey ?? `id:${organisation.id}`
            if (keys.includes(key)) continue
            keys.push(key)

            const institution = institutions.get(key)
            if (institution) {
                if (!institution.ids.includes(id)) institution.ids.push(id)
                institution.projects += 1
            } else {
                institutions.set(key, {key, ids: [id], projects: 1})
            }
        }
        if (keys.length < 2) return

        const score = scanned - position
        for (let i = 0; i < keys.length; i += 1) {
            for (let j = i + 1; j < keys.length; j += 1) {
                const [a, b] = keys[i] < keys[j] ? [keys[i], keys[j]] : [keys[j], keys[i]]
                const pairKey = `${a}\u0000${b}`
                const existing = pairs.get(pairKey)
                if (existing) {
                    existing.weight += 1
                    existing.rankScore += score
                } else {
                    pairs.set(pairKey, {a, b, weight: 1, rankScore: score})
                }
            }
        }
    })

    return {pairs: [...pairs.values()], institutions}
}

/**
 * The cap that respects the ranking: the `maxEdges` strongest pairs by shared
 * projects, ties broken by how highly the underlying projects ranked, and last
 * by key so the result never depends on iteration order.
 */
export function topEdges(pairs: readonly Pair[], maxEdges: number): Pair[] {
    return [...pairs]
        .sort((x, y) => y.weight - x.weight || y.rankScore - x.rankScore || (x.a + x.b < y.a + y.b ? -1 : 1))
        .slice(0, maxEdges)
}

export interface QueryNetworkPayload {
    /** Institution key -> node index: how per-project organisations find their node. */
    nodeIndexByKey: Map<string, number>
    nodes: NetworkNode[]
    edges: Array<{a: number; b: number; w: number}>
    edgesFound: number
    capped: boolean
    withoutGeo: number
}

/**
 * Nodes are the endpoints of the kept edges only — an institution whose every
 * pair fell under the cap is not drawn. Ordered by shared-project degree so
 * the list beside the graph starts with the hubs.
 */
export function buildQueryNetwork(options: {
    counts: PairCounts
    organisations: ReadonlyMap<string, NetworkOrganisation>
    maxEdges: number
}): QueryNetworkPayload {
    const {counts, organisations, maxEdges} = options
    const kept = topEdges(counts.pairs, maxEdges)

    const degree = new Map<string, number>()
    for (const pair of kept) {
        degree.set(pair.a, (degree.get(pair.a) ?? 0) + pair.weight)
        degree.set(pair.b, (degree.get(pair.b) ?? 0) + pair.weight)
    }
    const keys = [...degree.keys()].sort((x, y) => degree.get(y)! - degree.get(x)! || (x < y ? -1 : 1))
    const indexOf = new Map(keys.map((key, index) => [key, index]))

    const nodes: NetworkNode[] = keys.map((key) => {
        const institution = counts.institutions.get(key)!
        const organisation = organisations.get(institution.ids[0])!
        // A duplicate record with coordinates fills in for one without.
        const located =
            [organisation, ...institution.ids.map((id) => organisations.get(id)!)].find(
                (candidate) => !Number.isNaN(candidate.lat) && !Number.isNaN(candidate.lng),
            ) ?? null
        return {
            id: institution.ids[0],
            ids: institution.ids,
            name: organisation.name,
            lat: located ? located.lat : null,
            lng: located ? located.lng : null,
            w: institution.projects,
            countryCode: organisation.country,
        }
    })

    return {
        nodeIndexByKey: indexOf,
        nodes,
        edges: kept.map((pair) => ({a: indexOf.get(pair.a)!, b: indexOf.get(pair.b)!, w: pair.weight})),
        edgesFound: counts.pairs.length,
        capped: counts.pairs.length > kept.length,
        withoutGeo: nodes.filter((node) => node.lat === null).length,
    }
}

// --- per-project columns (the cluster view) ---------------------------------

/** One scanned project as the search returns it: `_id` and the doc values. */
export interface ScannedProjectFields {
    id: string
    orgIds: readonly string[]
    topic?: string
    year?: number
    amount?: number
    funder?: string
}

export interface ProjectColumns {
    ids: string[]
    orgs: number[][]
    topic: number[]
    year: number[]
    amount: number[]
    funder: number[]
    topics: string[]
    funders: string[]
}

/**
 * The scanned projects that touch a drawn organisation, as compact columns in
 * ranking order. A project's organisations become NODE INDEXES (through the
 * same institution fold the pairs used, so a duplicate record lands on its
 * node); a project none of whose organisations is drawn is left out — the
 * cluster view cannot place it. Topic and funder go through small dictionaries
 * because 2,000 projects repeat a few dozen of each.
 */
export function buildProjectColumns(options: {
    projects: readonly ScannedProjectFields[]
    organisations: ReadonlyMap<string, NetworkOrganisation>
    /** Institution key -> node index, from buildQueryNetwork. */
    nodeIndexByKey: ReadonlyMap<string, number>
}): ProjectColumns {
    const {projects, organisations, nodeIndexByKey} = options
    const columns: ProjectColumns = {ids: [], orgs: [], topic: [], year: [], amount: [], funder: [], topics: [], funders: []}
    const topicIndex = new Map<string, number>()
    const funderIndex = new Map<string, number>()
    const intern = (dictionary: string[], index: Map<string, number>, value: string | undefined): number => {
        if (!value) return -1
        const existing = index.get(value)
        if (existing !== undefined) return existing
        dictionary.push(value)
        index.set(value, dictionary.length - 1)
        return dictionary.length - 1
    }

    for (const project of projects) {
        const nodes: number[] = []
        for (const id of project.orgIds.slice(0, MAX_ORGS_PER_PROJECT)) {
            const organisation = organisations.get(id)
            if (!organisation) continue
            const node = nodeIndexByKey.get(organisation.nameKey ?? `id:${organisation.id}`)
            if (node !== undefined && !nodes.includes(node)) nodes.push(node)
        }
        if (nodes.length === 0) continue

        columns.ids.push(project.id)
        columns.orgs.push(nodes)
        columns.topic.push(intern(columns.topics, topicIndex, project.topic))
        columns.year.push(project.year && project.year > 0 ? project.year : 0)
        columns.amount.push(project.amount && project.amount > 0 ? Math.round(project.amount) : 0)
        columns.funder.push(intern(columns.funders, funderIndex, project.funder))
    }
    return columns
}
