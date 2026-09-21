import type {Client} from '@opensearch-project/opensearch'

// index name + mapping live together here, same pattern as health.ts.
// Seeded from a one-off extraction out of the legacy digicher_webinterface
// Postgres (core_mats.collaboration_network_view joined to institution_view) —
// see apps/web/public/demo/collaboration-edges.json, which apps/api's demo
// module bulk-indexes into this index. That JSON file is the durable source
// of truth; this index can always be rebuilt from it.

export const demoCollaborationIndexName = 'demo_collaboration_edges'

// geo_point accepts a [lon, lat] array directly, which is exactly the shape
// the source materialized views already use — no coordinate reshaping needed
// anywhere in this pipeline.
const demoCollaborationIndexMapping = {
    mappings: {
        properties: {
            institution_id: {type: 'keyword'},
            institution_name: {type: 'text'},
            institution_geolocation: {type: 'geo_point'},
            institution_country: {type: 'keyword'},
            institution_type: {type: 'keyword'},
            institution_sme: {type: 'boolean'},
            collaborator_id: {type: 'keyword'},
            collaborator_name: {type: 'text'},
            collaborator_geolocation: {type: 'geo_point'},
            collaborator_country: {type: 'keyword'},
            collaborator_type: {type: 'keyword'},
            collaborator_sme: {type: 'boolean'},
            project_count: {type: 'integer'},
            projects: {
                type: 'nested',
                properties: {
                    project_id: {type: 'keyword'},
                    title: {type: 'text'},
                    total_cost: {type: 'float'},
                    combined_institution_cost: {type: 'float'},
                    institution_cost: {type: 'float'},
                    collaborator_cost: {type: 'float'},
                    start_date: {type: 'date'},
                    end_date: {type: 'date'},
                    framework_programmes: {type: 'keyword'},
                },
            },
        },
    },
} as const

export async function ensureDemoCollaborationIndex(client: Client) {
    const {body: exists} = await client.indices.exists({index: demoCollaborationIndexName})
    if (exists) return

    await client.indices.create({
        index: demoCollaborationIndexName,
        body: demoCollaborationIndexMapping,
    })
}
