'use client'

import type {OrganisationProject, OrganisationProjectsResponse} from '@heritagemonitor/shared'
import {RelatedList, type RelatedRow} from '../entity/RelatedList'
import {formatResultCount} from '../entity/searchState'

export interface OrganisationProjectsTabProps {
    projects: OrganisationProjectsResponse
    page: number
    onPageChange: (page: number) => void
    loading: boolean
    /** Opens this project on the projects entity — see buildEntityLink. */
    onSelectProject: (projectId: string) => void
}

function toRow(project: OrganisationProject): RelatedRow {
    return {
        id: project.id,
        primary:
            project.acronym && project.title
                ? `${project.acronym} — ${project.title}`
                : (project.acronym ?? project.title ?? project.id),
        secondary: [
            project.year != null ? String(project.year) : null,
            [...project.funder, ...project.programme].join(' / ') || null,
            project.funded_amount_eur != null
                ? `approx. ${Math.round(project.funded_amount_eur).toLocaleString('en-US')} EUR`
                : null,
        ]
            .filter(Boolean)
            .join(' · '),
        badge: project.isCoordinator ? 'Coordinator' : undefined,
    }
}

/**
 * The projects this organisation worked on, biggest budget first, with the
 * ones it coordinates marked. A row is a link INTO the projects entity.
 */
export function OrganisationProjectsTab({projects, page, onPageChange, loading, onSelectProject}: OrganisationProjectsTabProps) {
    return (
        <RelatedList
            caption={`${formatResultCount(projects)} projects, largest budget first`}
            rows={projects.hits.map(toRow)}
            page={page}
            pageCount={projects.pageCount}
            onPageChange={onPageChange}
            loading={loading}
            emptyMessage="No projects recorded for this organisation."
            onSelect={onSelectProject}
        />
    )
}
