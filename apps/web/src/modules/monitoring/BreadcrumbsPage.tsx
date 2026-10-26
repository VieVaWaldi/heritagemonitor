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
import type {BreadcrumbRow} from '@heritagemonitor/shared'
import {useBreadcrumbFeed} from './hooks/useBreadcrumbFeed'

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

// DD/MM/YY hh:mm:ss, fixed-width so a column of these lines up — same
// treatment as the live-requests feed beside it.
function formatTimestamp(iso: string): string {
    const date = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return (
        `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${pad(date.getFullYear() % 100)} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    )
}

// Key in secondary (gold), value in primary (teal), decoded — a raw
// `topic=13718&topic=13719` string is unreadable at a glance.
function ParamsCell({query}: {query: string}) {
    const entries = [...new URLSearchParams(query).entries()]
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

function BreadcrumbTableRow({row}: {row: BreadcrumbRow}) {
    const cellSx = {fontFamily: MONO_FONT, whiteSpace: 'nowrap' as const}

    return (
        <TableRow hover>
            <TableCell sx={cellSx}>{formatTimestamp(row.createdAt)}</TableCell>
            {/* Six characters is enough to follow one visit down the page and
                not enough to be mistaken for an identity. */}
            <TableCell sx={{...cellSx, color: 'text.secondary'}}>{row.sessionId.slice(0, 6)}</TableCell>
            <TableCell sx={{...cellSx, fontWeight: 600}}>{row.path}</TableCell>
            <TableCell sx={cellSx}>
                <ParamsCell query={row.query} />
            </TableCell>
        </TableRow>
    )
}

/**
 * The last 100 pages visitors landed on, newest first.
 *
 * Deliberately shows no IP and no user agent — there are none stored (see
 * packages/db's breadcrumbs table). The session id is a random per-tab token,
 * truncated here, and exists only to follow one visit's path.
 */
export function BreadcrumbsPage() {
    const feed = useBreadcrumbFeed()

    return (
        <Box sx={{p: 4}}>
            <Typography variant="h4" component="h1" gutterBottom>
                Breadcrumbs
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                The last 100 pages visitors opened, newest first. No IP address or user agent is recorded; the session id is a
                random per-tab token.
                {feed.state === 'ok' && ` Kept for ${feed.retentionDays} days.`}
            </Typography>

            {feed.state === 'loading' && <Typography variant="body2">Loading…</Typography>}

            {feed.state === 'error' && (
                <Typography variant="body2" color="error">
                    {feed.message}
                </Typography>
            )}

            {feed.state === 'ok' && feed.rows.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                    No breadcrumbs recorded yet.
                </Typography>
            )}

            {feed.state === 'ok' && feed.rows.length > 0 && (
                <TableContainer component={Paper} sx={{maxWidth: '100%'}}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Timestamp</TableCell>
                                <TableCell>Session</TableCell>
                                <TableCell>Path</TableCell>
                                <TableCell>Parameters</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {feed.rows.map((row) => (
                                <BreadcrumbTableRow key={row.id} row={row} />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    )
}
