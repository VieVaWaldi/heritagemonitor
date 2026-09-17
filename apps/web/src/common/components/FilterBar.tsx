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
export function FilterBar({children}: FilterBarProps) {
    return (
        <Paper variant="outlined" sx={{px: 2, py: 1.5, flexShrink: 0}}>
            <Stack direction="row" spacing={1.5} sx={{flexWrap: 'wrap'}}>
                {children}
            </Stack>
        </Paper>
    )
}
