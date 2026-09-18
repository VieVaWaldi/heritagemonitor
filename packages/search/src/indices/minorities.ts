// Index name only — unlike indices/health.ts, this package doesn't own
// creation/mapping for `minorities`. That's hm_pipeline's
// index_opensearch.py (see its docstring for the mapping/facet-tier
// rationale); this package only ever reads the index.
export const minoritiesIndexName = 'minorities'
