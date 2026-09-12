'use client'

import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import Select, {type SelectChangeEvent} from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type {RequestTimeWindow} from '@heritagemonitor/shared'
import {LineChart} from '@mui/x-charts/LineChart'
import {useState} from 'react'
import {useMonitoredRoutes} from './hooks/useMonitoredRoutes'
import {useRequestTimeSeries} from './hooks/useRequestTimeSeries'
import {WindowToggle} from './WindowToggle'

const ALL_ROUTES_VALUE = '__all__'

export function RequestTimePage() {
    const [selectedRoute, setSelectedRoute] = useState<string | null>(null)
    const [window, setWindow] = useState<RequestTimeWindow>('1h')

    const monitoredRoutes = useMonitoredRoutes()
    const series = useRequestTimeSeries(selectedRoute, window)

    const routeSelectValue = selectedRoute ?? ALL_ROUTES_VALUE

    function handleRouteChange(event: SelectChangeEvent) {
        const value = event.target.value
        setSelectedRoute(value === ALL_ROUTES_VALUE ? null : value)
    }

    return (
        <Box sx={{p: 4}}>
            <Typography variant="h4" component="h1" gutterBottom>
                Request Time
            </Typography>

            <Stack direction={{xs: 'column', sm: 'row'}} spacing={2} sx={{mb: 3, alignItems: 'center'}}>
                <Select
                    size="small"
                    value={routeSelectValue}
                    onChange={handleRouteChange}
                    sx={{minWidth: 220}}
                    disabled={monitoredRoutes.state !== 'ok'}
                >
                    <MenuItem value={ALL_ROUTES_VALUE}>All routes</MenuItem>
                    {monitoredRoutes.state === 'ok' &&
                        monitoredRoutes.routes.map((route) => (
                            <MenuItem key={route} value={route}>
                                {route}
                            </MenuItem>
                        ))}
                </Select>

                <WindowToggle value={window} onChange={setWindow}/>
            </Stack>

            {monitoredRoutes.state === 'error' && (
                <Typography variant="body2" color="error" sx={{mb: 2}}>
                    Couldn&apos;t load tracked routes: {monitoredRoutes.message}
                </Typography>
            )}

            {series.state === 'loading' && <Typography variant="body2">Loading…</Typography>}

            {series.state === 'error' && (
                <Typography variant="body2" color="error">
                    {series.message}
                </Typography>
            )}

            {series.state === 'ok' && series.buckets.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                    No requests recorded yet for this route/window.
                </Typography>
            )}

            {series.state === 'ok' && series.buckets.length > 0 && (
                <LineChart
                    dataset={series.buckets.map((bucket) => ({
                        time: bucket.bucketStart,
                        avgMs: Math.round(bucket.avgMs * 10) / 10,
                        maxMs: Math.round(bucket.maxMs * 10) / 10,
                    }))}
                    xAxis={[{dataKey: 'time', scaleType: 'time', label: 'time'}]}
                    yAxis={[{label: 'ms'}]}
                    series={[
                        {dataKey: 'avgMs', label: 'avg (ms)', showMark: false},
                        {dataKey: 'maxMs', label: 'max (ms)', showMark: false},
                    ]}
                    height={380}
                />
            )}

            <Typography variant="caption" color="text.secondary" sx={{display: 'block', mt: 2}}>
                Polling api /v1/monitoring/request-time every 15s · in-memory, resets on api restart
            </Typography>
        </Box>
    )
}
