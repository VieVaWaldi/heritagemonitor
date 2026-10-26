// The OpenSearch layer: one configured client, the index names, the id-lookup
// helpers and the pure query builders. No domain logic — that belongs to
// apps/api's services (see apps/api/RULES.md rule 3).

export {client} from './client.js'
export {getDocument, mgetDocuments} from './documents.js'

export * as indices from './indices/index.js'
export * as query from './query/index.js'
