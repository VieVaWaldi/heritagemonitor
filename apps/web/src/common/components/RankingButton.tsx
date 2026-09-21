'use client'

import {useState} from 'react'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Divider from '@mui/material/Divider'
import {alpha} from '@mui/material/styles'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import SwapVertIcon from '@mui/icons-material/SwapVert'
import {Text} from '@/common/text'

/**
 * One sort choice. Shaped so an entity's own option list from
 * @heritagemonitor/shared (PROJECT_SORT_OPTIONS, MINORITY_SORT_OPTIONS, ...)
 * can be passed straight in: the wire value is the contract, this component
 * only renders it.
 */
export interface RankingOption<TValue extends string = string> {
    value: TValue
    label: string
    /** Arrow shown next to the label; null for a ranking with no direction (relevance). */
    direction?: 'asc' | 'desc' | null
}

export interface RankingButtonProps<TValue extends string = string> {
    options: readonly RankingOption<TValue>[]
    /** `null` = no explicit choice; the list is in whatever order its api decided. */
    value: TValue | null
    onChange: (value: TValue | null) => void
    /** Label of that "no explicit choice" row. */
    defaultLabel?: string
}

const ROW_HEIGHT = 40
const PANEL_MIN_WIDTH = 200

function DirectionIcon({direction}: {direction: 'asc' | 'desc' | null | undefined}) {
    if (direction === 'asc') return <ArrowUpwardIcon fontSize="small" />
    if (direction === 'desc') return <ArrowDownwardIcon fontSize="small" />
    return <SwapVertIcon fontSize="small" />
}

// Sort control for a results list's PaginatedList header — same hover-panel
// language as EntitySelector, just a labeled button instead of an icon circle
// since the current ranking needs to be legible at a glance. Generic over the
// option list: every entity has its own rankings, none of them belong here.
export function RankingButton<TValue extends string = string>({
    options,
    value,
    onChange,
    defaultLabel = 'Default',
}: RankingButtonProps<TValue>) {
    const [open, setOpen] = useState(false)
    const rows: RankingOption<TValue | ''>[] = [{value: '', label: defaultLabel, direction: null}, ...options]
    const active = rows.find((row) => (row.value === '' ? value === null : row.value === value)) ?? rows[0]

    function handleSelect(row: RankingOption<TValue | ''>) {
        onChange(row.value === '' ? null : (row.value as TValue))
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
                    {rows.map((row, index) => (
                        <Box key={row.label}>
                            {index > 0 && <Divider />}
                            <ButtonBase
                                role="option"
                                aria-selected={row === active}
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
