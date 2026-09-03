'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export function HomePage() {
    return (
        <Box sx={{p: 4}}>
            <Typography variant="h4" component="h1">
                HeritageMonitor
            </Typography>
            <Typography variant="body1" sx={{mt: 1}}>
                Frontend is up.
            </Typography>
        </Box>
    )
}