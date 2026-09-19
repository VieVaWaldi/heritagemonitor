'use client'

import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import type {RecentRequestEntry} from '@heritagemonitor/shared'
import {useRecentRequests} from './hooks/useRecentRequests'

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

// DD/MM/YY hh:mm:ss, fixed-width so a column of these lines up.
function formatTimestamp(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    return (
        `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${pad(date.getFullYear() % 100)} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    )
}

// Key in secondary (gold), value in primary (teal) — lets a row's params be
// scanned at a glance instead of reading through one undifferentiated string.
function QueryCell({query}: {query: Record<string, string>}) {
    const entries = Object.entries(query)
    if (entries.length === 0) return <Box component="span" sx={{color: 'text.disabled'}}>—</Box>

    return (
        <>
            {entries.map(([key, value], index) => (
                <Box component="span" key={`${key}-${index}`} sx={{whiteSpace: 'pre'}}>
                    {index > 0 && '  '}
                    <Box component="span" sx={{color: 'secondary.main'}}>{key}</Box>
                    <Box component="span" sx={{color: 'text.disabled'}}>=</Box>
                    <Box component="span" sx={{color: 'primary.main'}}>{value}</Box>
                </Box>
            ))}
        </>
    )
}

function RequestRow({entry}: {entry: RecentRequestEntry}) {
    const isError = entry.statusCode >= 400
    const cellSx = {fontFamily: MONO_FONT, whiteSpace: 'nowrap' as const}

    return (
        <TableRow hover>
            <TableCell sx={cellSx}>{formatTimestamp(entry.timestamp)}</TableCell>
            <TableCell sx={{...cellSx, fontWeight: 600}}>{entry.method}</TableCell>
            <TableCell sx={cellSx}>{entry.path}</TableCell>
            <TableCell sx={{...cellSx, color: isError ? 'error.main' : 'success.main', fontWeight: 600}}>
                {entry.statusCode}
            </TableCell>
            <TableCell sx={cellSx}>
                <QueryCell query={entry.query} />
            </TableCell>
            <TableCell sx={{...cellSx, textAlign: 'right'}}>{Math.round(entry.durationMs)}ms</TableCell>
        </TableRow>
    )
}

export function LiveRequestsPage() {
    const recentRequests = useRecentRequests()

    return (
        <Box sx={{p: 4}}>
            <Typography variant="h4" component="h1" gutterBottom>
                Live Requests
            </Typography>

            {recentRequests.state === 'loading' && <Typography variant="body2">Loading…</Typography>}

            {recentRequests.state === 'error' && (
                <Typography variant="body2" color="error">
                    {recentRequests.message}
                </Typography>
            )}

            {recentRequests.state === 'ok' && recentRequests.requests.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                    No requests recorded yet.
                </Typography>
            )}

            {recentRequests.state === 'ok' && recentRequests.requests.length > 0 && (
                <TableContainer component={Paper} sx={{maxWidth: '100%'}}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Timestamp</TableCell>
                                <TableCell>Method</TableCell>
                                <TableCell>Path</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Query</TableCell>
                                <TableCell align="right">Duration</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {recentRequests.requests.map((entry, index) => (
                                <RequestRow key={`${entry.timestamp.getTime()}-${index}`} entry={entry} />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Typography variant="caption" color="text.secondary" sx={{display: 'block', mt: 2}}>
                Polling api /v1/monitoring/recent-requests every 2s · last 100 requests, in-memory, resets on api
                restart · excludes /v1/monitoring/* traffic
            </Typography>
        </Box>
    )
}
