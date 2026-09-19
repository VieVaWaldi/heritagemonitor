'use client'

import useMediaQuery from '@mui/material/useMediaQuery'
import type {Theme} from '@mui/material/styles'

// Phone-width cutoff — MUI's default 'sm' breakpoint (600px). No other
// mobile-vs-desktop split exists yet in this app (HMMenu's own comment notes
// it's "Desktop-only for now" with no phone variant), so this is the first
// place that needed to draw the line.
export function useIsMobile(): boolean {
    return useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'))
}
