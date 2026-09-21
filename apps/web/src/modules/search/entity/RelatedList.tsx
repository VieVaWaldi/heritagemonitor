'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import Pagination from '@mui/material/Pagination'
import type {ReactNode} from 'react'
import {Text} from '@/common/text'
import {NoticeBar} from '@/common/components'

/** One row of a detail panel's related list, already reduced to what it shows. */
export interface RelatedRow {
    id: string
    primary: string
    secondary: string
    /** Short marker on the right, e.g. "Coordinator". */
    badge?: string
    /** Icon before the badge, e.g. a map pin for a geolocated organisation. */
    icon?: ReactNode
}

export interface RelatedListProps {
    /** Line above the list, e.g. "194 organisations, coordinators first". */
    caption: string
    rows: RelatedRow[]
    page: number
    pageCount: number
    onPageChange: (page: number) => void
    loading: boolean
    emptyMessage: string
    /** Row click — always a deep link into that entity (see buildEntityLink). */
    onSelect: (id: string) => void
    /**
     * What of the surrounding page this list is (and is not) filtered by —
     * built by ./relatedParams from the same table the request uses. Shown
     * even when the list is empty, because "why is this empty" is exactly when
     * it matters.
     */
    filterCaption?: string
    /**
     * True when the list came back from the api's typo-tolerant rerun. Related
     * lists ask for the strict search only (see relatedPaths.STRICT), so this
     * should not happen; if it ever does, the caption says so instead of
     * presenting a looser search as the parent's exact count.
     */
    closeMatches?: boolean
}

const ROW_HEIGHT = 64

/**
 * The list a detail panel's tabs show: a project's organisations, an
 * organisation's projects, a work's projects. All three are the same thing —
 * a paginated set of rows belonging to the open document, each a link into
 * its own entity — so they are one component rather than three that drift.
 *
 * What differs between them is only which fields become `primary`/`secondary`,
 * which each tab decides for itself, because only it knows its own domain.
 */
export function RelatedList({
    caption,
    rows,
    page,
    pageCount,
    onPageChange,
    loading,
    emptyMessage,
    onSelect,
    filterCaption,
    closeMatches = false,
}: RelatedListProps) {
    // Shown above the rows AND above the empty message: "why is this list
    // empty" is the question the caption exists to answer.
    const filterLine = filterCaption ? (
        <Box sx={{px: 2, pt: 1}}>
            <NoticeBar compact>{filterCaption}</NoticeBar>
        </Box>
    ) : null

    if (rows.length === 0) {
        return (
            <Box sx={{height: '100%', display: 'flex', flexDirection: 'column'}}>
                {filterLine}
                <Box sx={{flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2.5}}>
                    <Text variant="body2" color="text.secondary" sx={{textAlign: 'center'}}>
                        {loading ? 'Loading…' : emptyMessage}
                    </Text>
                </Box>
            </Box>
        )
    }

    return (
        <Box sx={{height: '100%', display: 'flex', flexDirection: 'column'}}>
            {filterLine}
            <Text variant="caption" color="text.secondary" sx={{px: 2.5, py: 1}}>
                {caption}
                {closeMatches ? ' — close matches, not exact' : ''}
            </Text>

            <List disablePadding sx={{flex: '1 1 auto', overflowY: 'auto'}}>
                {rows.map((row) => (
                    <ListItemButton
                        key={row.id}
                        divider
                        onClick={() => onSelect(row.id)}
                        sx={{height: ROW_HEIGHT, display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5}}
                    >
                        <Box sx={{flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column'}}>
                            <Text variant="body2" truncate sx={{color: 'primary.main', fontWeight: 500}}>
                                {row.primary}
                            </Text>
                            <Text variant="caption" truncate color="text.secondary">
                                {row.secondary}
                            </Text>
                        </Box>
                        {row.icon}
                        {row.badge && (
                            <Chip label={row.badge} size="small" color="primary" variant="outlined" sx={{flexShrink: 0}} />
                        )}
                    </ListItemButton>
                ))}
            </List>

            {pageCount > 1 && (
                <Box sx={{display: 'flex', justifyContent: 'center', py: 1, borderTop: 1, borderColor: 'divider'}}>
                    <Pagination count={pageCount} page={page} onChange={(_event, value) => onPageChange(value)} size="small" />
                </Box>
            )}
        </Box>
    )
}
