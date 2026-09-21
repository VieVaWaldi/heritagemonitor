'use client'

import Box from '@mui/material/Box'
import ListItemButton from '@mui/material/ListItemButton'
import {Text} from '@/common/text'
import type {Cluster} from './clusters'
import {clusterColorHex} from './clusterGraph'

export interface ClusterRowProps {
    cluster: Cluster
    title: string
    subtitle: string
    selected: boolean
    onSelect: (id: string) => void
}

// Same two-line shape and height as every other result row in the app.
const ROW_HEIGHT = 64

/** One community of the list: colour dot, title, and how big and how strong it is. */
export function ClusterRow({cluster, title, subtitle, selected, onSelect}: ClusterRowProps) {
    return (
        <ListItemButton
            divider
            selected={selected}
            onClick={() => onSelect(cluster.id)}
            sx={{height: ROW_HEIGHT, display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5}}
        >
            <Box sx={{width: 14, height: 14, borderRadius: '50%', flexShrink: 0, backgroundColor: clusterColorHex(cluster.id)}} />
            <Box sx={{flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column'}}>
                <Text variant="body1" truncate sx={{color: 'primary.main', fontWeight: 500}}>
                    {cluster.id}. {title}
                </Text>
                <Text variant="body2" truncate color="text.secondary">
                    {subtitle}
                </Text>
            </Box>
        </ListItemButton>
    )
}

/** "12 organisations · 34 projects · led by X" — the second line of a cluster row. */
export function clusterRowSubtitle(cluster: Cluster, ledBy: string): string {
    return `${cluster.members.length.toLocaleString('en-US')} organisations · ${cluster.projects.length.toLocaleString('en-US')} projects · ${ledBy}`
}

