'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import type {ReactNode} from 'react'

export const FACET_SIDEBAR_WIDTH = 260

export interface FacetSidebarProps {
    /** FacetSections — each already its own bordered card, stacked vertically. */
    children: ReactNode
}

// Fixed-width column of separate facet cards. Plain layout, no border of
// its own — FacetSection carries that per-facet, so the column reads as
// several distinct boxes rather than one long shared one.
export function FacetSidebar({children}: FacetSidebarProps) {
    return (
        <Box sx={{width: FACET_SIDEBAR_WIDTH, flexShrink: 0, height: '100%', overflowY: 'auto'}}>
            <Stack spacing={2}>{children}</Stack>
        </Box>
    )
}
