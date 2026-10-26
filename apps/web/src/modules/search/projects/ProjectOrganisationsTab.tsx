'use client'

import type {ProjectOrganisation, ProjectOrganisationsResponse} from '@heritagemonitor/shared'
import PlaceIcon from '@mui/icons-material/Place'
import Tooltip from '@mui/material/Tooltip'
import {RelatedList, type RelatedRow} from '../entity/RelatedList'

export interface ProjectOrganisationsTabProps {
    organisations: ProjectOrganisationsResponse
    page: number
    onPageChange: (page: number) => void
    loading: boolean
    /** Opens this organisation on the organisations entity — see buildEntityLink. */
    onSelectOrganisation: (organisationId: string) => void
}

function toRow(organisation: ProjectOrganisation): RelatedRow {
    return {
        id: organisation.id,
        primary: organisation.legalName ?? organisation.legalShortName ?? organisation.id,
        secondary: [
            organisation.countryCode,
            organisation.region && organisation.region !== 'Unknown' ? organisation.region : null,
            organisation.rorTypes.filter((type) => type !== 'unknown').join(', ') || null,
            organisation.project_count != null ? `${organisation.project_count.toLocaleString('en-US')} projects` : null,
        ]
            .filter(Boolean)
            .join(' · '),
        badge: organisation.isCoordinator ? 'Coordinator' : undefined,
        // Only ~18% of project-connected organisations are geolocated, and
        // that is what decides whether one can appear on a map at all.
        icon: organisation.hasGeo ? (
            <Tooltip title="Has coordinates (appears on maps)">
                <PlaceIcon fontSize="small" sx={{color: 'text.disabled', flexShrink: 0}} />
            </Tooltip>
        ) : undefined,
    }
}

/**
 * The organisations that worked on the selected project, coordinators first
 * (the order the index itself stores them in — see the api's
 * getProjectOrganisations). A row is a link INTO the organisations entity.
 */
export function ProjectOrganisationsTab({organisations, page, onPageChange, loading, onSelectOrganisation}: ProjectOrganisationsTabProps) {
    return (
        <RelatedList
            caption={`${organisations.estimatedTotalHits.toLocaleString('en-US')} organisations, coordinators first`}
            rows={organisations.hits.map(toRow)}
            page={page}
            pageCount={organisations.pageCount}
            onPageChange={onPageChange}
            loading={loading}
            emptyMessage="No organisations recorded for this project."
            onSelect={onSelectOrganisation}
        />
    )
}
