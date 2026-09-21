'use client'

import type {ExpertRow} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import ListItemButton from '@mui/material/ListItemButton'
import PlaceIcon from '@mui/icons-material/Place'
import Tooltip from '@mui/material/Tooltip'
import {Text} from '@/common/text'
import {formatCount, formatOrganisationFunding, knownRegion, organisationName} from '../organisations/organisationFormat'

export interface ExpertResultRowProps {
    expert: ExpertRow
    selected: boolean
    onSelect: (id: string) => void
}

const ROW_HEIGHT = 64

export function ExpertResultRow({expert, selected, onSelect}: ExpertResultRowProps) {
    // The matching projects come first and are named as such: the lifetime
    // totals beside them are a different, much larger number, and confusing
    // the two is the one way this page can mislead.
    const meta = [
        expert.countryCode,
        knownRegion(expert.region),
        `${formatCount(expert.project_count, 'project')} in total`,
        formatOrganisationFunding(expert.total_funding_eur),
    ]
        .filter(Boolean)
        .join(' · ')

    return (
        <ListItemButton
            divider
            selected={selected}
            onClick={() => onSelect(expert.id)}
            sx={{height: ROW_HEIGHT, display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5}}
        >
            <Box sx={{flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column'}}>
                <Text variant="body1" truncate sx={{color: 'primary.main', fontWeight: 500}}>
                    {organisationName(expert)}
                </Text>
                <Text variant="body2" truncate color="text.secondary">
                    {meta}
                </Text>
            </Box>

            {/* The same institution appears in the index under several ids;
                this row stands for all of them (D19). */}
            {expert.mergedRecords > 1 && (
                <Tooltip title={`${expert.mergedRecords} index records merged into this organisation`}>
                    <Chip label={`${expert.mergedRecords} records`} size="small" variant="outlined" sx={{flexShrink: 0}} />
                </Tooltip>
            )}
            {expert.hasGeo && (
                <Tooltip title="Has coordinates (appears on maps)">
                    <PlaceIcon fontSize="small" sx={{color: 'text.disabled', flexShrink: 0}} />
                </Tooltip>
            )}
            {expert.has_dch_project && <Chip label="DCH" size="small" color="secondary" variant="outlined" sx={{flexShrink: 0}} />}

            <Tooltip title="Projects matching your current search">
                <Chip
                    label={`${expert.matchedProjects.toLocaleString('en-US')} matching`}
                    size="small"
                    color="primary"
                    sx={{flexShrink: 0, minWidth: 96}}
                />
            </Tooltip>
        </ListItemButton>
    )
}
