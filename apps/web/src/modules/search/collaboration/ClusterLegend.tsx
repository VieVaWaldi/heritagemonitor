'use client'

import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import {Text} from '@/common/text'
import {clusterColorHex} from './clusterGraph'
import type {Cluster} from './clusters'

export interface ClusterLegendProps {
    clusters: readonly Cluster[]
    titles: ReadonlyMap<string, {title: string}>
    selectedId: string | null
    onSelect: (id: string) => void
}

/** Most clusters the legend lists; the rest are in the list on the left. */
const LEGEND_LIMIT = 8

/** The colour key of the graph: one clickable chip per (strongest) cluster. */
export function ClusterLegend({clusters, titles, selectedId, onSelect}: ClusterLegendProps) {
    if (clusters.length === 0) return null
    const shown = clusters.slice(0, LEGEND_LIMIT)

    return (
        <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.75, px: 2, pb: 1}}>
            {shown.map((cluster) => (
                <ButtonBase
                    key={cluster.id}
                    onClick={() => onSelect(cluster.id)}
                    aria-pressed={cluster.id === selectedId}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        px: 1,
                        py: 0.25,
                        maxWidth: 220,
                        borderRadius: 3,
                        border: 1,
                        borderColor: cluster.id === selectedId ? clusterColorHex(cluster.id) : 'divider',
                        backgroundColor: cluster.id === selectedId ? 'action.selected' : 'transparent',
                    }}
                >
                    <Box sx={{width: 10, height: 10, borderRadius: '50%', flexShrink: 0, backgroundColor: clusterColorHex(cluster.id)}} />
                    <Text variant="caption" truncate>
                        {cluster.id}. {titles.get(cluster.id)?.title ?? `Cluster ${cluster.id}`}
                    </Text>
                </ButtonBase>
            ))}
            {clusters.length > LEGEND_LIMIT && (
                <Text variant="caption" color="text.secondary" sx={{alignSelf: 'center'}}>
                    +{clusters.length - LEGEND_LIMIT} more in the list
                </Text>
            )}
        </Box>
    )
}
