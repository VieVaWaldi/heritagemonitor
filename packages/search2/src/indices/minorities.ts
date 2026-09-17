// Index name only — unlike indices/health.ts, this package doesn't own
// creation/settings for `minorities`. That's hm_pipeline's
// index_meilisearch.py (see its docstring for the settings/facet-tier
// rationale); this package only ever reads the index.
export const minoritiesIndexName = 'minorities'
