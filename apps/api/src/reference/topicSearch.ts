import type {TopicLevel} from '@heritagemonitor/shared'

// Tolerant name search over the in-memory topic table.
//
// NOTE ON THE DATA: `topics.json` carries NAMES only — no keywords, no
// descriptions (plan section 4, index gaps). So this matches the three levels'
// names and nothing else: searching "bronze age" finds topics whose NAME says
// bronze age, not every topic about it. Adding keywords upstream is what would
// widen that, not a cleverer matcher here.

export interface SearchableTopicNode {
    id: string
    name: string
    level: TopicLevel
    fieldId: string | null
    fieldName: string | null
    subfieldId: string | null
    subfieldName: string | null
}

/**
 * Lowercase, strip accents, collapse punctuation. "Ärchäologie" and
 * "archaologie" have to reach the same tokens, and a user typing
 * "archaeology," should not be punished for the comma.
 */
export function normalize(text: string): string {
    return text
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()
}

export function tokenize(text: string): string[] {
    const normalized = normalize(text)
    return normalized ? normalized.split(' ') : []
}

/**
 * Levenshtein distance, bounded: it stops as soon as the whole row exceeds
 * `max`, so a long non-match costs a couple of rows instead of the full grid.
 */
export function editDistanceWithin(a: string, b: string, max: number): number | null {
    if (Math.abs(a.length - b.length) > max) return null

    let previous = Array.from({length: b.length + 1}, (_, index) => index)
    for (let i = 1; i <= a.length; i += 1) {
        const current = [i]
        let rowMin = i
        for (let j = 1; j <= b.length; j += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1
            const value = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost)
            current.push(value)
            if (value < rowMin) rowMin = value
        }
        if (rowMin > max) return null
        previous = current
    }

    const distance = previous[b.length]
    return distance <= max ? distance : null
}

/** How many edits a token of this length may be wrong by — the same ladder OpenSearch's AUTO uses. */
export function allowedEdits(token: string): number {
    if (token.length >= 8) return 2
    if (token.length >= 4) return 1
    return 0
}

// How well ONE query token matched ONE name: lower is better, so the scores
// add up across tokens and sort naturally.
const EXACT_WORD = 0
const PREFIX = 1
const FUZZY = 3
const NO_MATCH = Number.POSITIVE_INFINITY

interface TokenMatch {
    score: number
    /** Where in the name the best match sat — earlier reads as more about it. */
    position: number
}

function scoreToken(token: string, nameTokens: string[]): TokenMatch {
    let best: TokenMatch = {score: NO_MATCH, position: nameTokens.length}
    const edits = allowedEdits(token)

    for (const [index, nameToken] of nameTokens.entries()) {
        if (nameToken === token) {
            if (EXACT_WORD < best.score) best = {score: EXACT_WORD, position: index}
            // An exact match cannot be beaten on score, only on position, and
            // positions only grow from here.
            break
        }
        if (nameToken.startsWith(token)) {
            if (PREFIX < best.score) best = {score: PREFIX, position: index}
            continue
        }
        if (edits > 0) {
            const distance = editDistanceWithin(token, nameToken, edits)
            if (distance !== null && FUZZY + distance < best.score) best = {score: FUZZY + distance, position: index}
        }
    }

    return best
}

// A hit on the level the user is actually choosing beats the same words
// appearing on a broader one: "archaeology" should offer the topic before the
// whole field it sits in.
const LEVEL_PENALTY: Record<TopicLevel, number> = {topic: 0, subfield: 1, field: 2}

export interface ScoredTopicNode {
    node: SearchableTopicNode
    score: number
}

/**
 * Every node whose NAME matches all of the query's tokens, best first.
 *
 * AND over tokens, deliberately: "roman architecture" should not return every
 * topic with "roman" in it. Each token may match exactly, as a prefix, or —
 * from four characters up — within one edit (two from eight), which is what
 * makes "archeology" find "Archaeology".
 */
export function searchTopicNodes(nodes: readonly SearchableTopicNode[], q: string, limit: number): ScoredTopicNode[] {
    const tokens = tokenize(q)
    if (tokens.length === 0) return []

    const scored: ScoredTopicNode[] = []
    for (const node of nodes) {
        const nameTokens = tokenize(node.name)
        let total = 0
        let positions = 0
        let matchedAll = true

        for (const token of tokens) {
            const match = scoreToken(token, nameTokens)
            if (match.score === NO_MATCH) {
                matchedAll = false
                break
            }
            total += match.score
            positions += match.position
        }

        if (!matchedAll) continue
        // Tie-breaks, in order of weight: a name that LEADS with the query
        // word is more about it than one that mentions it halfway through
        // ("Archaeology and Cultural Heritage" before "Roman Archaeology and
        // Architecture"), and among equals the shorter name is the more
        // precise answer.
        scored.push({node, score: total + LEVEL_PENALTY[node.level] + positions / 10 + nameTokens.length / 100})
    }

    return scored.sort((a, b) => a.score - b.score || a.node.name.localeCompare(b.node.name)).slice(0, limit)
}
