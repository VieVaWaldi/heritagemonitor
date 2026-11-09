import {z} from 'zod'

// Contract for the /search page's download feature: an export is a search
// request re-run without pagination, streamed to a file instead of a page.

export const EXPORT_FORMATS = ['csv', 'json'] as const
export const exportFormatSchema = z.enum(EXPORT_FORMATS)
export type ExportFormat = z.infer<typeof exportFormatSchema>

// A hard cap, surfaced to the user in the UI, so an unfiltered export of a
// 50M-document index can't be requested by accident.
export const EXPORT_MAX_ROWS = 1_000_000

// `search_after` batch size the backend scans in — one big fetch would hold
// the whole result set in memory and keep an OpenSearch scroll context open.
export const EXPORT_SCAN_BATCH_SIZE = 2000
