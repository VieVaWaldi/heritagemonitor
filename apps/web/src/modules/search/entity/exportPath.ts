// Relative, not the `@/` alias: unit-tested by Node's own test runner (see
// apps/web/test/exportPath.test.ts), which does not resolve the webpack alias.
import {SEARCH_PARAM, toApiSearchParams} from '../../../common/url/codecs.ts'

export type ExportEntity = 'projects' | 'works'
export type ExportFormat = 'csv' | 'json'

export interface ExportOptions {
    format: ExportFormat
    /** Projects only: leave out machine-translated projects. */
    excludeTranslated?: boolean
    /** Projects only: add the topic classification columns. */
    includeTopic?: boolean
}

/**
 * `/v1/<entity>/export?...` for the search currently in the URL: the same
 * params `/search` gets, minus `page`/`sort` (an export is every match, in no
 * particular order). Toggles are omitted when off, never sent as `false`.
 */
export function buildExportPath(entity: ExportEntity, params: URLSearchParams, options: ExportOptions): string {
    const next = new URLSearchParams(toApiSearchParams(params))
    next.delete(SEARCH_PARAM.page)
    next.delete(SEARCH_PARAM.sort)
    next.set('format', options.format)
    if (entity === 'projects') {
        if (options.excludeTranslated) next.set('excludeTranslated', 'true')
        if (options.includeTopic) next.set('includeTopic', 'true')
    }
    return `/v1/${entity}/export?${next.toString()}`
}
