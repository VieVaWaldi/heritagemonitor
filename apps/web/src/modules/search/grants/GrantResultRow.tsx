'use client'

import type {GrantRow} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import ListItemButton from '@mui/material/ListItemButton'
import Tooltip from '@mui/material/Tooltip'
import {Text} from '@/common/text'
import {PSEUDO_GRANT_LABEL, formatCount, formatGrantFunding, grantFunder, grantTitle, heritageShare} from './grantFormat'

export interface GrantResultRowProps {
    grant: GrantRow
    selected: boolean
    onSelect: (id: string) => void
}

// Same two-line shape as every other result row: headline plus one meta line.
const ROW_HEIGHT = 64

export function GrantResultRow({grant, selected, onSelect}: GrantResultRowProps) {
    const meta = [
        grantFunder(grant),
        grant.jurisdiction,
        formatCount(grant.dch_project_count, 'heritage project'),
        heritageShare(grant),
        formatGrantFunding(grant.total_funded_eur),
    ]
        .filter(Boolean)
        .join(' · ')

    return (
        <ListItemButton
            divider
            selected={selected}
            onClick={() => onSelect(grant.id)}
            sx={{height: ROW_HEIGHT, display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5}}
        >
            <Box sx={{flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column'}}>
                <Text variant="body1" truncate sx={{color: 'primary.main', fontWeight: 500}}>
                    {grantTitle(grant)}
                </Text>
                <Text variant="body2" truncate color="text.secondary">
                    {meta}
                </Text>
            </Box>

            {/* A pseudo stream is a bucket for projects with no programme
                recorded, not a programme — saying so on the row stops it being
                read as one. */}
            {grant.is_pseudo && (
                <Tooltip title={PSEUDO_GRANT_LABEL}>
                    <Chip label="No stream" size="small" variant="outlined" sx={{flexShrink: 0}} />
                </Tooltip>
            )}
        </ListItemButton>
    )
}
