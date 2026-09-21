'use client'

import Box from '@mui/material/Box'
import ListItemButton from '@mui/material/ListItemButton'
import {Text} from '@/common/text'
import type {ExplorerItem} from './explorerTypes'

// Same fixed height as SearchResultRow: long titles truncate instead of growing the row.
const ROW_HEIGHT = 64

export interface ExplorerRowProps {
    item: ExplorerItem
    selected: boolean
    onSelect: (id: string) => void
}

export function ExplorerRow({item, selected, onSelect}: ExplorerRowProps) {
    return (
        <ListItemButton divider selected={selected} onClick={() => onSelect(item.id)} sx={{height: ROW_HEIGHT, px: 2.5}}>
            <Box sx={{flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column'}}>
                <Text variant="body1" truncate sx={{fontWeight: 500}}>
                    {item.title}
                </Text>
                <Text variant="body2" truncate color="text.secondary">
                    {item.subtitle}
                </Text>
            </Box>
        </ListItemButton>
    )
}
