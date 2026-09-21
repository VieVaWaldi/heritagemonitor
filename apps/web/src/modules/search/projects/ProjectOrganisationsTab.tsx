'use client'

import type {ProjectOrganisation, ProjectOrganisationsResponse} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import ListItemButton from '@mui/material/ListItemButton'
import List from '@mui/material/List'
import Pagination from '@mui/material/Pagination'
import PlaceIcon from '@mui/icons-material/Place'
import Tooltip from '@mui/material/Tooltip'
import {Text} from '@/common/text'

export interface ProjectOrganisationsTabProps {
    organisations: ProjectOrganisationsResponse
    page: number
    onPageChange: (page: number) => void
    loading: boolean
    /** Opens this organisation on the organisations entity — see buildEntityLink. */
    onSelectOrganisation: (organisationId: string) => void
}

const ROW_HEIGHT = 64

function organisationMeta(organisation: ProjectOrganisation): string {
    return [
        organisation.countryCode,
        organisation.region && organisation.region !== 'Unknown' ? organisation.region : null,
        organisation.rorTypes.filter((type) => type !== 'unknown').join(', ') || null,
        organisation.project_count != null ? `${organisation.project_count.toLocaleString('en-US')} projects` : null,
    ]
        .filter(Boolean)
        .join(' · ')
}

/**
 * The organisations that worked on the selected project, coordinators first
 * (the order the index itself stores them in — see the api's
 * getProjectOrganisations).
 *
 * A row is a link INTO the organisations entity (`?e=organisations&only=<id>&sel=<id>`):
 * showing an organisation's own page inside the projects page would be the
 * wrong place for it, and the deep link keeps one entity per screen.
 */
export function ProjectOrganisationsTab({organisations, page, onPageChange, loading, onSelectOrganisation}: ProjectOrganisationsTabProps) {
    if (organisations.hits.length === 0) {
        return (
            <Box sx={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2.5}}>
                <Text variant="body2" color="text.secondary" sx={{textAlign: 'center'}}>
                    {loading ? 'Loading…' : 'No organisations recorded for this project.'}
                </Text>
            </Box>
        )
    }

    return (
        <Box sx={{height: '100%', display: 'flex', flexDirection: 'column'}}>
            <Text variant="caption" color="text.secondary" sx={{px: 2.5, py: 1}}>
                {organisations.estimatedTotalHits.toLocaleString('en-US')} organisations, coordinators first
            </Text>

            <List disablePadding sx={{flex: '1 1 auto', overflowY: 'auto'}}>
                {organisations.hits.map((organisation) => (
                    <ListItemButton
                        key={organisation.id}
                        divider
                        onClick={() => onSelectOrganisation(organisation.id)}
                        sx={{height: ROW_HEIGHT, display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5}}
                    >
                        <Box sx={{flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column'}}>
                            <Text variant="body2" truncate sx={{color: 'primary.main', fontWeight: 500}}>
                                {organisation.legalName ?? organisation.legalShortName ?? organisation.id}
                            </Text>
                            <Text variant="caption" truncate color="text.secondary">
                                {organisationMeta(organisation)}
                            </Text>
                        </Box>

                        {/* Only ~18% of project-connected organisations are
                            geolocated, so having a location is worth marking —
                            it is what decides whether one appears on a map. */}
                        {organisation.hasGeo && (
                            <Tooltip title="Has coordinates (appears on maps)">
                                <PlaceIcon fontSize="small" sx={{color: 'text.disabled', flexShrink: 0}} />
                            </Tooltip>
                        )}
                        {organisation.isCoordinator && (
                            <Chip label="Coordinator" size="small" color="primary" variant="outlined" sx={{flexShrink: 0}} />
                        )}
                    </ListItemButton>
                ))}
            </List>

            {organisations.pageCount > 1 && (
                <Box sx={{display: 'flex', justifyContent: 'center', py: 1, borderTop: 1, borderColor: 'divider'}}>
                    <Pagination
                        count={organisations.pageCount}
                        page={page}
                        onChange={(_event, value) => onPageChange(value)}
                        size="small"
                    />
                </Box>
            )}
        </Box>
    )
}
