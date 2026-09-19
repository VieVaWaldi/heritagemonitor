'use client'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import {alpha} from '@mui/material/styles'

// Pure presentational overlay — no deck.gl import, so it's reusable
// regardless of how the map underneath is rendered. Ported from
// digicher_webinterface's DeckGLMap.tsx, which had this inline.

export interface MapStatusOverlayProps {
    loading?: boolean
    error?: Error | null
}

export function MapStatusOverlay({loading = false, error = null}: MapStatusOverlayProps) {
    if (!loading && !error) return null

    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: (theme) => alpha(theme.palette.common.black, 0.2),
            }}
        >
            {loading && (
                <Paper sx={{p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                    <CircularProgress size={32} />
                    <Typography variant="body2" color="text.secondary" sx={{mt: 2}}>
                        Loading...
                    </Typography>
                </Paper>
            )}
            {error && (
                <Paper sx={{p: 3}}>
                    <Typography color="error">{error.message}</Typography>
                </Paper>
            )}
        </Box>
    )
}
