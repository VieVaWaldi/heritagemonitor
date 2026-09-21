'use client'

import type {ProjectRow} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import ListItemButton from '@mui/material/ListItemButton'
import {Text} from '@/common/text'
import {formatCount, formatFunderProgramme, formatFunding, formatYear, projectHeadline} from './projectFormat'

export interface ProjectResultRowProps {
    project: ProjectRow
    selected: boolean
    onSelect: (id: string) => void
}

// Two-line row, same shape as MinorityResultRow: headline plus a single meta
// line. Kept as its own component rather than shared with the minorities row
// — they show different things and are expected to keep diverging (that
// component's own comment makes the same point).
const ROW_HEIGHT = 64

export function ProjectResultRow({project, selected, onSelect}: ProjectResultRowProps) {
    const meta = [
        formatYear(project.year),
        formatFunderProgramme(project.funder, project.programme),
        formatFunding(project.funded_amount_eur),
        formatCount(project.org_count, 'organisation'),
        project.topic?.topic_name,
    ]
        .filter(Boolean)
        .join(' · ')

    return (
        <ListItemButton
            divider
            selected={selected}
            onClick={() => onSelect(project.id)}
            sx={{height: ROW_HEIGHT, display: 'flex', alignItems: 'center', gap: 2, px: 2.5}}
        >
            <Box sx={{flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column'}}>
                <Text variant="body1" truncate sx={{color: 'primary.main', fontWeight: 500}}>
                    {projectHeadline(project)}
                </Text>
                <Text variant="body2" truncate color="text.secondary">
                    {meta}
                </Text>
            </Box>

            {/* The corpus badge is shown on the row, not only in the detail:
                in the SCI corpus a DCH project is the interesting one. */}
            {project.is_ch && <Chip label="DCH" size="small" color="secondary" variant="outlined" sx={{flexShrink: 0}} />}
        </ListItemButton>
    )
}
