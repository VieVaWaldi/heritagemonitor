'use client'

import Box from '@mui/material/Box'
import ListItemButton from '@mui/material/ListItemButton'
import {Text} from '@/common/text'
import {edgeSubtitle, type QueryEdge} from './queryNetworkAdapter'

export interface QueryEdgeRowProps {
    edge: QueryEdge
    rank: number
    selected: boolean
    onSelect: (id: string) => void
}

// Same two-line shape and height as every other result row in the app.
const ROW_HEIGHT = 64

/** One collaboration of the list: the two organisations and how many projects they share. */
export function QueryEdgeRow({edge, rank, selected, onSelect}: QueryEdgeRowProps) {
    return (
        <ListItemButton
            divider
            selected={selected}
            onClick={() => onSelect(edge.id)}
            sx={{height: ROW_HEIGHT, display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5}}
        >
            <Text variant="body2" color="text.secondary" sx={{flexShrink: 0, width: 28, textAlign: 'right'}}>
                {rank}
            </Text>
            <Box sx={{flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column'}}>
                <Text variant="body1" truncate sx={{color: 'primary.main', fontWeight: 500}}>
                    {edge.a.name} ↔ {edge.b.name}
                </Text>
                <Text variant="body2" truncate color="text.secondary">
                    {edgeSubtitle(edge)}
                </Text>
            </Box>
        </ListItemButton>
    )
}
