'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type {HealthCheckResult} from '@heritagemonitor/shared'
import {useHealthStatus} from './hooks/useHealthStatus'

function CheckRow({check}: {check: HealthCheckResult}) {
    return (
        <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
            <Chip
                label={check.name}
                color={check.status === 'ok' ? 'success' : 'error'}
                sx={{width: 110}}
            />
            <Typography variant="body2" color="text.secondary">
                {check.message} · checked {check.checkedAt.toLocaleTimeString()}
            </Typography>
        </Box>
    )
}

export function HealthPage() {
    const status = useHealthStatus()

    return (
        <Box sx={{p: 4}}>
            <Typography variant="h4" component="h1" gutterBottom>
                System Health
            </Typography>

            {status.state === 'loading' && <Chip label="checking..."/>}
            {status.state === 'error' && (
                <Typography variant="body2" color="error">
                    {status.message} · last attempted {status.checkedAt.toLocaleTimeString()}
                </Typography>
            )}
            {status.state === 'ok' && (
                <Stack spacing={1.5}>
                    {status.data.checks.map((check) => (
                        <CheckRow key={check.name} check={check}/>
                    ))}
                </Stack>
            )}

            <Typography variant="caption" color="text.secondary" sx={{display: 'block', mt: 2}}>
                Polling api /v1/health every 5s
            </Typography>
        </Box>
    )
}
