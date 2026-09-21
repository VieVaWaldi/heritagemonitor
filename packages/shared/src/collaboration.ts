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
