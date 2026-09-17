'use client'

import {useState} from 'react'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Divider from '@mui/material/Divider'
import {alpha} from '@mui/material/styles'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import SwapVertIcon from '@mui/icons-material/SwapVert'
import {MINORITY_SORT_OPTIONS, type MinoritySortOption} from '@heritagemonitor/shared'
import {Text} from '@/common/text'

export interface RankingButtonProps {
    value: MinoritySortOption | null
    onChange: (value: MinoritySortOption | null) => void
}

const ROW_HEIGHT = 40
const PANEL_MIN_WIDTH = 200

interface RankingRow {
    value: MinoritySortOption | null
    label: string
    direction: 'asc' | 'desc' | null
}

const ROWS: RankingRow[] = [
    {value: null, label: 'Default', direction: null},
    ...MINORITY_SORT_OPTIONS.map((option) => ({value: option.value, label: option.label, direction: option.direction})),
]

function DirectionIcon({direction}: {direction: 'asc' | 'desc' | null}) {
    if (direction === 'asc') return <ArrowUpwardIcon fontSize="small" />
    if (direction === 'desc') return <ArrowDownwardIcon fontSize="small" />
    return <SwapVertIcon fontSize="small" />
}

// Sort control for MinoritiesResultsPanel's PaginatedList header — same
// hover-panel language as EntitySelector, just a labeled button instead of
// an icon circle since the current ranking needs to be legible at a glance.
export function RankingButton({value, onChange}: RankingButtonProps) {
    const [open, setOpen] = useState(false)
    const active = ROWS.find((row) => row.value === value) ?? ROWS[0]

    function handleSelect(row: RankingRow) {
        onChange(row.value)
        setOpen(false)
    }

    return (
        <Box onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} sx={{position: 'relative'}}>
            <ButtonBase
                onClick={() => setOpen(true)}
                aria-haspopup="listbox"
                aria-expanded={open}
                sx={(theme) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    height: 32,
                    px: 1.25,
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    color: 'text.secondary',
                    '&:hover': {backgroundColor: alpha(theme.palette.primary.main, 0.08)},
                })}
            >
                <DirectionIcon direction={active.direction} />
                <Text variant="body2">{active.label}</Text>
            </ButtonBase>

            <Box
                role="listbox"
                sx={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    pt: 1,
                    minWidth: PANEL_MIN_WIDTH,
                    opacity: open ? 1 : 0,
                    visibility: open ? 'visible' : 'hidden',
                    pointerEvents: open ? 'auto' : 'none',
                    transition: 'opacity 150ms ease',
                    zIndex: (theme) => theme.zIndex.appBar,
                }}
            >
                <Box
                    sx={{
                        borderRadius: '12px',
                        backgroundColor: 'background.paper',
                        border: 1,
                        borderColor: 'divider',
                        boxShadow: 2,
                        overflow: 'hidden',
                    }}
                >
                    {ROWS.map((row, index) => (
                        <Box key={row.label}>
                            {index > 0 && <Divider />}
                            <ButtonBase
                                role="option"
                                aria-selected={row.value === value}
                                onClick={() => handleSelect(row)}
                                sx={(theme) => ({
                                    width: '100%',
                                    height: ROW_HEIGHT,
                                    justifyContent: 'flex-start',
                                    gap: 1,
                                    px: 1.5,
                                    backgroundColor: 'transparent',
                                    '&:hover': {backgroundColor: alpha(theme.palette.primary.main, 0.08)},
                                })}
                            >
                                <DirectionIcon direction={row.direction} />
                                <Text variant="body2">{row.label}</Text>
                            </ButtonBase>
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    )
}
