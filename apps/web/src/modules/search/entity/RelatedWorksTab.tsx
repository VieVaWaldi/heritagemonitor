'use client'

import {workLinks, type WorkSearchResponse} from '@heritagemonitor/shared'
import {RelatedList, type RelatedRow} from './RelatedList'
import {formatResultCount} from './searchState'

export interface RelatedWorksTabProps {
    works: WorkSearchResponse
    page: number
    onPageChange: (page: number) => void
    loading: boolean
    /** Opens this work on the works entity — see buildEntityLink. */
    onSelectWork: (workId: string) => void
    emptyMessage: string
}

/**
 * The publications of the open project or organisation, most cited first.
 * Rows deep-link into the works entity, where the full record and its
 * PDF/DOI button live — the same pattern as every other cross-entity tab.
 */
export function RelatedWorksTab({works, page, onPageChange, loading, onSelectWork, emptyMessage}: RelatedWorksTabProps) {
    const rows: RelatedRow[] = works.hits.map((work) => ({
        id: work.id,
        primary: work.title ?? work.id,
        secondary: [
            work.authors.slice(0, 2).join(', ') || null,
            work.year != null ? String(work.year) : null,
            work.container_name,
            `${(work.citation_count ?? 0).toLocaleString('en-US')} citations`,
        ]
            .filter(Boolean)
            .join(' · '),
        // What kind of link this work has, so the list says at a glance where
        // the full text is — the link itself is one click away on its own page.
        badge: workLinks(work)[0]?.label,
    }))

    return (
        <RelatedList
            caption={`${formatResultCount(works)} publications, most cited first`}
            rows={rows}
            page={page}
            pageCount={works.pageCount}
            onPageChange={onPageChange}
            loading={loading}
            emptyMessage={emptyMessage}
            onSelect={onSelectWork}
        />
    )
}
