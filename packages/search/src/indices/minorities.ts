import {indexName} from './prefix.js'

// Index name only — unlike indices/health.ts, this package doesn't own
// creation/mapping for `minorities`. That's hm_pipeline's export/load.py
// (core_v4; see SERVING_DESIGN.md section 6.2 for the document shape); this
// package only ever reads the index.
export const minoritiesIndexName = indexName('minorities')
