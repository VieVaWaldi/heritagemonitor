'use client'

import type {WorkOrganisationsResponse, WorkProjectsResponse} from '@heritagemonitor/shared'
import {RelatedList, type RelatedRow} from '../entity/RelatedList'

export interface WorkProjectsTabProps {
    projects: WorkProjectsResponse
    page: number
    onPageChange: (page: number) => void
    loading: boolean
    onSelectProject: (projectId: string) => void
}

/** The projects this work is linked to. Rows deep-link into the projects entity. */
export function WorkProjectsTab({projects, page, onPageChange, loading, onSelectProject}: WorkProjectsTabProps) {
    const rows: RelatedRow[] = projects.hits.map((project) => ({
        id: project.id,
        primary:
            project.acronym && project.title
                ? `${project.acronym} — ${project.title}`
                : (project.acronym ?? project.title ?? project.id),
        secondary: [project.year != null ? String(project.year) : null, [...project.funder, ...project.programme].join(' / ') || null]
            .filter(Boolean)
            .join(' · '),
    }))

    return (
        <RelatedList
            caption={`${projects.estimatedTotalHits} linked ${projects.estimatedTotalHits === 1 ? 'project' : 'projects'}`}
            rows={rows}
            page={page}
            pageCount={projects.pageCount}
            onPageChange={onPageChange}
            loading={loading}
            emptyMessage="This work is not linked to any project in the index."
            onSelect={onSelectProject}
        />
    )
}

export interface WorkOrganisationsTabProps {
    organisations: WorkOrganisationsResponse
    page: number
    onPageChange: (page: number) => void
    loading: boolean
    onSelectOrganisation: (organisationId: string) => void
}

/**
 * The organisations behind this work. The index caps the stored id list at
 * 100, so a heavily co-authored paper shows the first 100 — the caption says
 * how many are listed rather than implying it is all of them.
 */
export function WorkOrganisationsTab({
    organisations,
    page,
    onPageChange,
    loading,
    onSelectOrganisation,
}: WorkOrganisationsTabProps) {
    const rows: RelatedRow[] = organisations.hits.map((organisation) => ({
        id: organisation.id,
        primary: organisation.legalName ?? organisation.legalShortName ?? organisation.id,
        secondary: [
            organisation.countryCode,
            organisation.region && organisation.region !== 'Unknown' ? organisation.region : null,
            organisation.project_count != null ? `${organisation.project_count.toLocaleString('en-US')} projects` : null,
        ]
            .filter(Boolean)
            .join(' · '),
    }))

    return (
        <RelatedList
            caption={`${organisations.estimatedTotalHits} linked ${organisations.estimatedTotalHits === 1 ? 'organisation' : 'organisations'} (the index stores at most 100 per work)`}
            rows={rows}
            page={page}
            pageCount={organisations.pageCount}
            onPageChange={onPageChange}
            loading={loading}
            emptyMessage="This work is not linked to any organisation in the index."
            onSelect={onSelectOrganisation}
        />
    )
}
