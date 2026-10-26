import {
    type MinoritySearchRequest,
    type ProjectSearchRequest,
    type TopicCountEntity,
    type TopicCountsResponse,
    type TopicSearchResponse,
    type TopicTreeResponse,
} from '@heritagemonitor/shared'
import {defaultPageKey, readDefaultPage, writeDefaultPage} from '../../common/search/defaultPageCache.js'
import {topicCount, topicSearchNodes, topicTree} from '../../reference/topics.js'
import {searchTopicNodes} from '../../reference/topicSearch.js'
import {aggregateMinorityTopicCounts} from '../minorities/minorities.service.js'
import {aggregateProjectTopicCounts} from '../projects/projects.service.js'

// Service layer for the topic browser. The tree and the name search are pure
// in-memory work over `api/topics.json`; only the COUNTS touch an index, and
// those belong to whichever entity the user is looking at — so they are asked
// of that module's service rather than re-implemented here
// (apps/api/RULES.md rule 4).

const MAX_SEARCH_HITS = 40

export function getTopicTree(): TopicTreeResponse {
    return {tree: topicTree(), topicCount: topicCount()}
}

/**
 * How many documents of the caller's CURRENT search fall under each node.
 *
 * The caller's own topic selection is excluded by the entity services before
 * aggregating: a tree that only counted what is already selected would show
 * zero everywhere else and make the next choice impossible.
 */
export async function getTopicCounts(
    entity: TopicCountEntity,
    request: ProjectSearchRequest & MinoritySearchRequest,
): Promise<TopicCountsResponse> {
    // The blank counts per corpus are the same for everyone and are what the
    // modal opens with, so they are worth holding — same mechanism as the
    // blank default pages.
    const blank = !request.q?.trim() && isOnlyCorpus(request)
    const cacheKey = defaultPageKey({entity: `topic-counts:${entity}`, corpus: request.c, page: 1, sort: undefined})
    if (blank) {
        const cached = readDefaultPage<TopicCountsResponse>(cacheKey)
        if (cached) return cached
    }

    // `experts` aggregates over projects: the experts page ranks the
    // organisations behind a project search, so its topic counts ARE the
    // project counts (see TOPIC_COUNT_ENTITIES).
    const counts =
        entity === 'minorities' ? await aggregateMinorityTopicCounts(request) : await aggregateProjectTopicCounts(request)

    if (blank) writeDefaultPage(cacheKey, counts)
    return counts
}

/** True when nothing but the corpus narrows the request — see getTopicCounts. */
function isOnlyCorpus(request: Record<string, unknown>): boolean {
    return Object.entries(request).every(([key, value]) => {
        if (key === 'c' || key === 'page' || key === 'sort' || key === 'entity') return true
        if (value == null) return true
        if (typeof value === 'string') return value.trim() === ''
        if (Array.isArray(value)) return value.length === 0
        return false
    })
}

export function searchTopics(q: string): TopicSearchResponse {
    return {
        hits: searchTopicNodes(topicSearchNodes(), q, MAX_SEARCH_HITS).map(({node}) => ({
            id: node.id,
            name: node.name,
            level: node.level,
            fieldId: node.fieldId,
            fieldName: node.fieldName,
            subfieldId: node.subfieldId,
            subfieldName: node.subfieldName,
        })),
    }
}
