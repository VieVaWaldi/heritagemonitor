'use client'

import type {FundingOrganisation} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import ListItemButton from '@mui/material/ListItemButton'
import PlaceIcon from '@mui/icons-material/Place'
import Tooltip from '@mui/material/Tooltip'
import {Text} from '@/common/text'
import {summariseFundingOrganisation} from './fundingFormat'

export interface FundingOrganisationRowProps {
    organisation: FundingOrganisation
    rank: number
    selected: boolean
    onSelect: (id: string) => void
}

// Same two-line shape and height as every other result row in the app.
const ROW_HEIGHT = 64

export function FundingOrganisationRow({organisation, rank, selected, onSelect}: FundingOrganisationRowProps) {
    return (
        <ListItemButton
            divider
            selected={selected}
            onClick={() => onSelect(organisation.id)}
            sx={{height: ROW_HEIGHT, display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5}}
        >
            <Text variant="body2" color="text.secondary" sx={{flexShrink: 0, width: 28, textAlign: 'right'}}>
                {rank}
            </Text>
            <Box sx={{flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column'}}>
                <Text variant="body1" truncate sx={{color: 'primary.main', fontWeight: 500}}>
                    {organisation.name}
                </Text>
                <Text variant="body2" truncate color="text.secondary">
                    {summariseFundingOrganisation(organisation)}
                </Text>
            </Box>

            {/* Without coordinates an organisation is in the ranking but not on
                the map — worth showing, since the two panels then disagree. */}
            {!organisation.hasGeo && (
                <Tooltip title="No coordinates — not shown on the map">
                    <PlaceIcon fontSize="small" sx={{color: 'text.disabled', opacity: 0.4, flexShrink: 0}} />
                </Tooltip>
            )}
        </ListItemButton>
    )
}
