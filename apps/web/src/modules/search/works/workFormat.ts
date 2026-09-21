import {languageName, type WorkDetail, type WorkRow} from '@heritagemonitor/shared'

// Presentation of work fields, in one place so a row, the overview tab and the
// chat context phrase the same thing the same way.

/** How many of the (up to 20) stored authors a row shows before "+N more". */
const AUTHORS_IN_ROW = 3

/**
 * "Kamilaris, Prenafeta-Boldu +4 more". `author_count` is the TRUE number —
 * the index stores only the first 20 names — so the overflow is counted from
 * it, not from the array length.
 */
export function formatAuthors(authors: string[], authorCount: number | null, limit = AUTHORS_IN_ROW): string {
    if (authors.length === 0) return authorCount ? `${authorCount} authors` : 'no authors recorded'
    const shown = authors.slice(0, limit)
    const total = authorCount ?? authors.length
    const hidden = total - shown.length
    return hidden > 0 ? `${shown.join(', ')} +${hidden} more` : shown.join(', ')
}

export function formatCitations(citationCount: number | null): string {
    const value = citationCount ?? 0
    return `${value.toLocaleString('en-US')} ${value === 1 ? 'citation' : 'citations'}`
}

export function workTitle(work: WorkRow | WorkDetail): string {
    return work.title ?? work.id
}

/** Journal/repository, year, publisher — the "where did this appear" line. */
export function workVenue(work: WorkRow | WorkDetail): string {
    return [work.container_name, work.year != null ? String(work.year) : null, work.publisher].filter(Boolean).join(' · ')
}

export function workLanguageName(work: WorkDetail): string | null {
    return languageName(work.language)
}
