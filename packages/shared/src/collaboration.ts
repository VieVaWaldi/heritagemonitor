import {z} from 'zod'
import {corpusSchema} from './search.js'

// The organisation network: one organisation in the middle, an arc to every
// organisation that shared a project with it. Compact on purpose — up to 500
// partners travel in one payload, so a node carries only what a map and a
// list need and an edge is two indices and a weight.

/** Partners returned unless the caller asks for fewer. */
export const ORG_NETWORK_DEFAULT_MAX = 500

/** The most partners a request may ask for. */
export const ORG_NETWORK_HARD_MAX = 1000

/** Partners per page of the list beside the map. */
export const ORG_NETWORK_PAGE_SIZE = 20

export const organisationNetworkRequestSchema = z.object({
    c: corpusSchema.optional(),
    /** `2019-2025`, as everywhere. */
    years: z.string().optional(),
    funder: z.array(z.string()).optional(),
    programme: z.array(z.string()).optional(),
    topic: z.array(z.string()).optional(),
    subfield: z.array(z.string()).optional(),
    field: z.array(z.string()).optional(),
    max: z.coerce.number().int().min(1).max(ORG_NETWORK_HARD_MAX).optional(),
})
export type OrganisationNetworkRequest = z.infer<typeof organisationNetworkRequestSchema>

export const networkNodeSchema = z.object({
    /** The record shown for this institution: its best-connected id. */
    id: z.string(),
    /** Every record id that is the same institution (D19); `id` is one of them. */
    ids: z.array(z.string()),
    name: z.string(),
    /** Null only for the centre, which may have no coordinates; every partner has them. */
    lat: z.number().nullable(),
    lng: z.number().nullable(),
    /** Shared projects with the centre; for the centre itself, its own matching projects. */
    w: z.number(),
    countryCode: z.string().nullable(),
})
export type NetworkNode = z.infer<typeof networkNodeSchema>

export const networkEdgeSchema = z.object({
    /** Indices into `nodes`. */
    a: z.number(),
    b: z.number(),
    /** Shared projects. */
    w: z.number(),
})
export type NetworkEdge = z.infer<typeof networkEdgeSchema>

export const organisationNetworkResponseSchema = z.object({
    /** Node 0 is the centre; the rest are its drawable partners, most shared projects first. */
    nodes: z.array(networkNodeSchema),
    edges: z.array(networkEdgeSchema),
    meta: z.object({
        /** Distinct partner institutions found (drawn or not). */
        partners: z.number(),
        /** Partners with no coordinates: counted, listed nowhere, not drawn. */
        withoutGeo: z.number(),
        /** True when the partner cap cut the list. */
        capped: z.boolean(),
        /** False while the server's organisation table is still loading. */
        complete: z.boolean(),
    }),
})
export type OrganisationNetworkResponse = z.infer<typeof organisationNetworkResponseSchema>

// --- the query network -------------------------------------------------------
//
// Who collaborates within the projects a text search matched: pairs of
// organisations counted over the top of the ranking, the strongest pairs kept.

/** Edges returned unless the caller asks for fewer or more. */
export const QUERY_NETWORK_DEFAULT_MAX_EDGES = 100
export const QUERY_NETWORK_MIN_EDGES = 10
/** The most edges a request may ask for — a hard server cap, the force layout gets slow beyond it. */
export const QUERY_NETWORK_HARD_MAX_EDGES = 300
/** Projects counted: the top of the ranking. The UI says "based on the top N matching projects". */
export const QUERY_NETWORK_PROJECTS_SCANNED = 2000

export const queryNetworkRequestSchema = z.object({
    q: z.string().optional(),
    c: corpusSchema.optional(),
    years: z.string().optional(),
    funder: z.array(z.string()).optional(),
    programme: z.array(z.string()).optional(),
    topic: z.array(z.string()).optional(),
    subfield: z.array(z.string()).optional(),
    field: z.array(z.string()).optional(),
    maxEdges: z.coerce.number().int().min(1).max(QUERY_NETWORK_HARD_MAX_EDGES).optional(),
})
export type QueryNetworkRequest = z.infer<typeof queryNetworkRequestSchema>

export const queryNetworkResponseSchema = z.object({
    /**
     * The endpoints of the kept edges, most connected first. `lat`/`lng` are
     * null for the many organisations without coordinates: the force graph
     * does not need them, the geographic view skips them.
     */
    nodes: z.array(networkNodeSchema),
    /** Strongest first: shared projects, ties broken by the ranking of those projects. */
    edges: z.array(networkEdgeSchema),
    /**
     * The scanned projects that touch a drawn organisation, in RANKING order
     * (index = position among them), as parallel columns to keep 2,000 of them
     * small. Missing values are `0` (year, amount) or `-1` (topic, funder).
     * `orgs` are indexes into `nodes`; `topic` and `funder` index the two
     * dictionaries below. No index change: all of it comes from doc values.
     */
    projects: z
        .object({
            ids: z.array(z.string()),
            orgs: z.array(z.array(z.number())),
            topic: z.array(z.number()),
            year: z.array(z.number()),
            amount: z.array(z.number()),
            funder: z.array(z.number()),
        })
        .default({ids: [], orgs: [], topic: [], year: [], amount: [], funder: []}),
    /** Topic ids (the projects index's `topic_id`) that `projects.topic` points into. */
    topics: z.array(z.string()).default([]),
    funders: z.array(z.string()).default([]),
    meta: z.object({
        /** Projects actually counted (at most QUERY_NETWORK_PROJECTS_SCANNED). */
        projectsScanned: z.number(),
        /** Projects the query matched — a floor when `totalCapped`, the real magnitude in `approxTotal` when known. */
        totalMatches: z.number(),
        totalCapped: z.boolean(),
        approxTotal: z.number().nullable(),
        /** Collaborating pairs found before the cap. */
        edgesFound: z.number(),
        /** True when the edge cap dropped pairs. */
        capped: z.boolean(),
        /** Drawn nodes without coordinates: in the graph, not on the map. */
        withoutGeo: z.number(),
        mode: z.enum(['strict', 'fuzzy']),
        didYouMean: z.array(z.string()),
        /** False while the server's organisation table is still loading. */
        complete: z.boolean(),
    }),
})
export type QueryNetworkResponse = z.infer<typeof queryNetworkResponseSchema>
