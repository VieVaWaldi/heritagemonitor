'use client'

import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import type {ReactNode} from 'react'

export interface FilterBarProps {
    /** FilterMenuButtons (or anything else) laid out in a row. */
    children: ReactNode
}

// Thin bordered strip for a row of filters — same Paper treatment
// (outlined, theme's 12px radius) as PaginatedList/TabbedPanel, so a
// filter bar sitting above them reads as part of the same family. Doesn't
// know what a "filter" is — that's FilterMenuButton's job.
//
// Always exactly one row: wrapping onto a second row would grow this bar
// every time another filter chip appears, stealing height from the list
// beside it. Overflow scrolls sideways instead — the row stays put, the
// chips that don't fit are a horizontal scroll away.
export function FilterBar({children}: FilterBarProps) {
    return (
        <Paper variant="outlined" sx={{px: 2, py: 1.5, flexShrink: 0}}>
            <Stack
                direction="row"
                sx={{
                    flexWrap: 'nowrap',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    columnGap: 1.5,
                    // Without this, flex's default shrink would squeeze every
                    // chip down to its min-content width before overflow (and
                    // a scrollbar) ever kicks in — each child keeps its
                    // natural size and the row scrolls instead.
                    '& > *': {flexShrink: 0},
                    // Thin, unobtrusive scrollbar — same recipe as SideMenu's.
                    scrollbarWidth: 'thin',
                    '&::-webkit-scrollbar': {height: 4},
                    '&::-webkit-scrollbar-thumb': {backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 2},
                }}
            >
                {children}
            </Stack>
        </Paper>
    )
}
