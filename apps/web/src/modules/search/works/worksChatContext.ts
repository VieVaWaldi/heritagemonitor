import {languageName, openAccessLabel, workLinks, type WorkDetail, type WorkRow} from '@heritagemonitor/shared'
import {SELECTED_ENTITY_CHARS, type PageContextSection, type PageContextSource} from '@/common/llmchat/pageContext'
import {formatAuthors, formatCitations, workTitle, workVenue} from './workFormat'

// What Lucy is told about the works page. Kept out of the panel component
// (apps/web/RULES.md #7): only this module knows which work fields matter.

export function summarizeWorkRow(work: WorkRow): string {
    const parts = [
        formatAuthors(work.authors, work.author_count, 3),
        workVenue(work),
        formatCitations(work.citation_count),
        openAccessLabel(work.open_access_color),
        work.is_ch_via_project ? 'cultural heritage via a linked project' : null,
    ].filter(Boolean)
    return `- [${work.id}] ${workTitle(work)} (${parts.join(', ')})`
}

export function selectedWorkSection(work: WorkDetail): PageContextSection {
    const lines = [
        `Title: ${workTitle(work)}`,
        `Authors: ${work.authors.length > 0 ? work.authors.join('; ') : 'none recorded'}${
            work.author_count != null && work.author_count > work.authors.length
                ? ` (${work.author_count} in total, first ${work.authors.length} stored)`
                : ''
        }`,
        `Published: ${[work.container_name, work.publisher].filter(Boolean).join(', ') || 'unknown'} — ${work.publication_date ?? work.year ?? 'no date'}`,
        `Impact: ${formatCitations(work.citation_count)}`,
        `Access: ${openAccessLabel(work.open_access_color) ?? 'no open-access colour recorded'}${work.best_access_right ? `, ${work.best_access_right}` : ''}`,
        work.language ? `Language: ${languageName(work.language)}` : null,
        work.doi ? `DOI: ${work.doi}` : null,
        `Linked to ${work.project_ids.length} project(s) and ${work.organisation_ids.length} organisation(s)${
            work.org_count != null && work.org_count > work.organisation_ids.length ? ` (of ${work.org_count}; the index stores the first 100)` : ''
        }`,
        work.is_ch_via_project
            ? 'Counted as digital cultural heritage because a LINKED PROJECT is — this is a proxy, not a judgement about the work.'
            : null,
        // There is no abstract on this index, and Lucy must not invent one.
        'No abstract is stored for works; to summarise the content, fetch the linked PDF or page.',
    ].filter(Boolean)

    return {
        heading: `The work currently open in the detail panel — ${workTitle(work)}:`,
        rows: [lines.join('\n')],
        maxCharsPerRow: SELECTED_ENTITY_CHARS,
    }
}

/**
 * What Lucy may fetch: the selected work's links first, then the best single
 * link per listed work.
 *
 * `workLinks` puts a `pdf_url` before a DOI deliberately — the api allowlists
 * her fetch tool by HOSTNAME of these URLs, and a doi.org link redirects to
 * whichever publisher owns the record, a host that is then not on the list.
 * A direct PDF is both what a reader wants and what actually fetches.
 */
export function workSources(selected: WorkDetail | null, rows: WorkRow[]): PageContextSource[] {
    const sources: PageContextSource[] = []
    const seen = new Set<string>()

    const add = (label: string, url: string) => {
        if (seen.has(url)) return
        seen.add(url)
        sources.push({label, url})
    }

    if (selected) {
        for (const link of workLinks(selected)) add(`${workTitle(selected)} (${link.label})`, link.url)
    }
    for (const row of rows) {
        const best = workLinks(row)[0]
        if (best) add(`${workTitle(row)} (${best.label})`, best.url)
    }

    return sources
}
