'use client'

import type {ProjectRow, ProjectSearchResponse} from '@heritagemonitor/shared'
import {RelatedList, type RelatedRow} from '../entity/RelatedList'
import {formatResultCount} from '../entity/searchState'

export interface GrantProjectsTabProps {
    projects: ProjectSearchResponse
    page: number
    onPageChange: (page: number) => void
    loading: boolean
    /** Opens this project on the projects entity — see buildEntityLink. */
    onSelectProject: (projectId: string) => void
    /** What of the surrounding page this list is filtered by — see relatedParams. */
    filterCaption?: string
}

function toRow(project: ProjectRow): RelatedRow {
    return {
        id: project.id,
        primary:
            project.acronym && project.title ? `${project.acronym} — ${project.title}` : (project.acronym ?? project.title ?? project.id),
        secondary: [
            project.year != null ? String(project.year) : null,
            project.funded_amount_eur != null ? `approx. ${Math.round(project.funded_amount_eur).toLocaleString('en-US')} EUR` : null,
            project.topic?.topic_name ?? null,
        ]
            .filter(Boolean)
            .join(' · '),
    }
}

/**
 * The projects this funding stream paid for. An ordinary project search
 * filtered to the stream, so the order is the projects list's own default
 * (largest budget first) and a row is a link INTO the projects entity.
 */
export function GrantProjectsTab({projects, page, onPageChange, loading, onSelectProject, filterCaption}: GrantProjectsTabProps) {
    return (
        <RelatedList
            caption={`${formatResultCount(projects)} projects, largest budget first`}
            filterCaption={filterCaption}
            closeMatches={projects.mode === 'fuzzy'}
            rows={projects.hits.map(toRow)}
            page={page}
            pageCount={projects.pageCount}
            onPageChange={onPageChange}
            loading={loading}
            emptyMessage="No projects are attributed to this funding stream in the current corpus."
            onSelect={onSelectProject}
        />
    )
}
