import {z} from 'zod'

// Contract for GET /v1/demo/collaboration-edges — shared between apps/api
// (produces, mapped from the `demo_collaboration_edges` OpenSearch index)
// and apps/web (validates at the network boundary before trusting it).
// See packages/search/src/indices/demoCollaboration.ts for the index this
// mirrors, and apps/web/public/demo/collaboration-edges.json for the seed
// data it's built from.

export const collaborationProjectSchema = z.object({
    project_id: z.string(),
    title: z.string(),
    total_cost: z.number().nullable(),
    combined_institution_cost: z.number().nullable(),
    // Each participant's own cost for this project (combined_institution_cost
    // is the pair's sum, so it can't be summed per org without double counting).
    institution_cost: z.number(),
    collaborator_cost: z.number(),
    // The source materialized view's own column type claims NOT NULL, but
    // real rows (ongoing projects at extraction time) have null dates —
    // trust the data over the stale type annotation.
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
    framework_programmes: z.array(z.string()).nullable(),
})
export type CollaborationProject = z.infer<typeof collaborationProjectSchema>

// geolocation is [lon, lat], matching how the source materialized view and
// the OpenSearch geo_point field both already store it.
export const collaborationEdgeSchema = z.object({
    institution_id: z.string(),
    institution_name: z.string(),
    institution_geolocation: z.tuple([z.number(), z.number()]),
    institution_country: z.string().nullable(),
    institution_type: z.string().nullable(),
    institution_sme: z.boolean().nullable(),
    collaborator_id: z.string(),
    collaborator_name: z.string(),
    collaborator_geolocation: z.tuple([z.number(), z.number()]),
    collaborator_country: z.string().nullable(),
    collaborator_type: z.string().nullable(),
    collaborator_sme: z.boolean().nullable(),
    project_count: z.number(),
    projects: z.array(collaborationProjectSchema),
})
export type CollaborationEdge = z.infer<typeof collaborationEdgeSchema>

export const collaborationEdgesResponseSchema = z.object({
    edges: z.array(collaborationEdgeSchema),
})
export type CollaborationEdgesResponse = z.infer<typeof collaborationEdgesResponseSchema>
