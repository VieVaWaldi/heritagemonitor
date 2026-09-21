import {z} from 'zod'

// Contract for GET /v1/topics/*. The tree is the OpenAlex hierarchy the api
// holds in memory (4,516 rows, `api/topics.json`); the counts come from
// whichever entity the caller is looking at.
//
// The `domain` level exists in the data but is deliberately not exposed: four
// buckets ("Physical Sciences", "Social Sciences", …) add a level of clicking
// without telling anyone anything they could act on.

export const TOPIC_LEVELS = ['field', 'subfield', 'topic'] as const
export type TopicLevel = (typeof TOPIC_LEVELS)[number]

/** The URL param each level's selection lives in — see common/url's codecs. */
export const TOPIC_LEVEL_PARAM: Record<TopicLevel, 'field' | 'subfield' | 'topic'> = {
    field: 'field',
    subfield: 'subfield',
    topic: 'topic',
}

export interface TopicTreeNode {
    id: string
    name: string
    level: TopicLevel
    children: TopicTreeNode[]
}

// Recursive, so declared with an explicit type rather than inferred.
export const topicTreeNodeSchema: z.ZodType<TopicTreeNode> = z.lazy(() =>
    z.object({
        id: z.string(),
        name: z.string(),
        level: z.enum(TOPIC_LEVELS),
        children: z.array(topicTreeNodeSchema),
    }),
)

export const topicTreeResponseSchema = z.object({
    /** Fields, each with its subfields, each with its topics. */
    tree: z.array(topicTreeNodeSchema),
    topicCount: z.number(),
})
export type TopicTreeResponse = z.infer<typeof topicTreeResponseSchema>

/**
 * How many documents of the CURRENT search fall under each node, per level.
 * A node missing from these maps has no matching documents and is hidden —
 * on the DCH corpus that is most of the tree (1,715 of 4,513 topics have a
 * DCH project on the real data).
 */
export const topicCountsResponseSchema = z.object({
    field: z.record(z.string(), z.number()),
    subfield: z.record(z.string(), z.number()),
    topic: z.record(z.string(), z.number()),
})
export type TopicCountsResponse = z.infer<typeof topicCountsResponseSchema>

/**
 * One search hit, with its ancestors — the modal needs them to expand the
 * path down to the match rather than dumping a flat list on the user.
 */
export const topicSearchHitSchema = z.object({
    id: z.string(),
    name: z.string(),
    level: z.enum(TOPIC_LEVELS),
    /** Null on a field (it IS the ancestor). */
    fieldId: z.string().nullable(),
    fieldName: z.string().nullable(),
    /** Null on a field or a subfield. */
    subfieldId: z.string().nullable(),
    subfieldName: z.string().nullable(),
})
export type TopicSearchHit = z.infer<typeof topicSearchHitSchema>

export const topicSearchResponseSchema = z.object({
    hits: z.array(topicSearchHitSchema),
})
export type TopicSearchResponse = z.infer<typeof topicSearchResponseSchema>

/** Entities whose current search the topic counts can be computed against. */
export const TOPIC_COUNT_ENTITIES = ['projects', 'minorities'] as const
export type TopicCountEntity = (typeof TOPIC_COUNT_ENTITIES)[number]
