// The api-side query builders for the core_v4 indexes: a TypeScript port of
// hm_pipeline's export/queries.py, which is where the syntax rules, the
// shard_size findings and the 10,000-window cap were measured. Everything
// here is a pure function returning an OpenSearch body or clause — the client
// lives one level up (../index.ts), the domain decisions in apps/api.

export * from './aggregations.js'
export * from './collaboration.js'
export * from './corpus.js'
export * from './facetValues.js'
export * from './grants.js'
export * from './minorities.js'
export * from './organisations.js'
export * from './pagination.js'
export * from './projects.js'
export * from './syntax.js'
export * from './typo.js'
export * from './works.js'
