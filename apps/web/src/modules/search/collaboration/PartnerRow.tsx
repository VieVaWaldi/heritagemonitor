'use client'

import type {NetworkNode} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import ListItemButton from '@mui/material/ListItemButton'
import Tooltip from '@mui/material/Tooltip'
import HubIcon from '@mui/icons-material/Hub'
import {Text} from '@/common/text'
import {nodeSubtitle} from './networkAdapter'

export interface PartnerRowProps {
    node: NetworkNode
    isCentre: boolean
    selected: boolean
    onSelect: (id: string) => void
    /** Make this organisation the centre of the network. */
    onCentre: (id: string) => void
}

// Same two-line shape and height as every other result row in the app.
const ROW_HEIGHT = 64

/**
 * One line of the collaborations list: the centre first, then its partners by
 * shared projects. A click selects (its pair opens in the detail tab, its arc
 * is drawn on top); the hub button re-centres the network on it.
 */
export function PartnerRow({node, isCentre, selected, onSelect, onCentre}: PartnerRowProps) {
    return (
        <ListItemButton
            divider
            selected={selected}
            onClick={() => onSelect(node.id)}
            sx={{height: ROW_HEIGHT, display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5}}
        >
            <Box sx={{flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column'}}>
                <Text variant="body1" truncate sx={{color: 'primary.main', fontWeight: 500}}>
                    {node.name}
                </Text>
                <Text variant="body2" truncate color="text.secondary">
                    {nodeSubtitle(node, isCentre)}
                </Text>
            </Box>
            {isCentre ? (
                <Chip label="Centre" size="small" color="secondary" variant="outlined" sx={{flexShrink: 0}} />
            ) : (
                <Tooltip title="Show this organisation's network">
                    <IconButton
                        size="small"
                        aria-label={`Centre the network on ${node.name}`}
                        onClick={(event) => {
                            event.stopPropagation()
                            onCentre(node.id)
                        }}
                    >
                        <HubIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}
        </ListItemButton>
    )
}
