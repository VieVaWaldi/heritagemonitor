'use client'

import type {OrganisationRow} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import ListItemButton from '@mui/material/ListItemButton'
import PlaceIcon from '@mui/icons-material/Place'
import Tooltip from '@mui/material/Tooltip'
import {Text} from '@/common/text'
import {formatCount, formatOrganisationFunding, knownRegion, knownRorTypes, organisationName} from './organisationFormat'

export interface OrganisationResultRowProps {
    organisation: OrganisationRow
    selected: boolean
    onSelect: (id: string) => void
}

// Same two-line shape as the project row: headline plus one meta line.
const ROW_HEIGHT = 64

export function OrganisationResultRow({organisation, selected, onSelect}: OrganisationResultRowProps) {
    const meta = [
        organisation.countryCode,
        knownRegion(organisation.region),
        knownRorTypes(organisation.rorTypes).join(', ') || null,
        formatCount(organisation.project_count, 'project'),
        formatCount(organisation.work_count, 'publication'),
        formatOrganisationFunding(organisation.total_funding_eur),
    ]
        .filter(Boolean)
        .join(' · ')

    return (
        <ListItemButton
            divider
            selected={selected}
            onClick={() => onSelect(organisation.id)}
            sx={{height: ROW_HEIGHT, display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5}}
        >
            <Box sx={{flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column'}}>
                <Text variant="body1" truncate sx={{color: 'primary.main', fontWeight: 500}}>
                    {organisationName(organisation)}
                </Text>
                <Text variant="body2" truncate color="text.secondary">
                    {meta}
                </Text>
            </Box>

            {/* Only ~18% of project-connected organisations are geolocated, and
                that is what decides whether one can appear on a map at all. */}
            {organisation.hasGeo && (
                <Tooltip title="Has coordinates (appears on maps)">
                    <PlaceIcon fontSize="small" sx={{color: 'text.disabled', flexShrink: 0}} />
                </Tooltip>
            )}
            {organisation.has_dch_project && (
                <Chip label="DCH" size="small" color="secondary" variant="outlined" sx={{flexShrink: 0}} />
            )}
        </ListItemButton>
    )
}
