'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type {RequestTimeWindow} from '@heritagemonitor/shared'
import {BarChart} from '@mui/x-charts/BarChart'
import {useState} from 'react'
import {useRequestCountByRoute} from './hooks/useRequestCountByRoute'
import {WindowToggle} from './WindowToggle'

const MIN_HEIGHT = 300
const HEIGHT_PER_ROUTE = 40
const MAX_HEIGHT = 700

export function RequestCountPage() {
    const [window, setWindow] = useState<RequestTimeWindow>('1h')
    const counts = useRequestCountByRoute(window)

    return (
        <Box sx={{p: 4}}>
            <Typography variant="h4" component="h1" gutterBottom>
                Request Count
            </Typography>

            <Stack direction="row" sx={{mb: 3}}>
                <WindowToggle value={window} onChange={setWindow}/>
            </Stack>

            {counts.state === 'loading' && <Typography variant="body2">Loading…</Typography>}

            {counts.state === 'error' && (
                <Typography variant="body2" color="error">
                    {counts.message}
                </Typography>
            )}

            {counts.state === 'ok' && counts.counts.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                    No requests recorded yet for this window.
                </Typography>
            )}

            {counts.state === 'ok' && counts.counts.length > 0 && (
                <BarChart
                    layout="horizontal"
                    // Already sorted busiest-first by the api — no re-sort here.
                    dataset={counts.counts.map((entry) => ({route: entry.route, count: entry.count}))}
                    yAxis={[{dataKey: 'route', scaleType: 'band'}]}
                    xAxis={[{label: 'requests'}]}
                    series={[{dataKey: 'count', label: 'requests'}]}
                    height={Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, counts.counts.length * HEIGHT_PER_ROUTE))}
                    margin={{left: 220}}
                />
            )}

            <Typography variant="caption" color="text.secondary" sx={{display: 'block', mt: 2}}>
                Polling api /v1/monitoring/request-count every 15s · in-memory, resets on api restart
            </Typography>
        </Box>
    )
}
