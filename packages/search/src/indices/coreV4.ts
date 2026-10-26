import {indexName} from './prefix.js'

// The five core_v4 research indexes. This package does NOT own their
// creation or mapping — hm_pipeline's `export/mappings/*.json` +
// `export/load.py` do (see SERVING_DESIGN.md section 6); heritagemonitor only
// ever reads them. Names live here so no module hardcodes a string.
//
// `minorities` keeps its own file (indices/minorities.ts) because it predates
// core_v4 and is referenced from the existing minorities module.
export const projectsIndexName = indexName('projects')
export const organisationsIndexName = indexName('organisations')
export const worksIndexName = indexName('works')
export const grantsIndexName = indexName('grants')
