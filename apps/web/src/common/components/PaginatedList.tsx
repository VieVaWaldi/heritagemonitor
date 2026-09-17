'use client'

import Box from '@mui/material/Box'
import List from '@mui/material/List'
import Pagination from '@mui/material/Pagination'
import Paper from '@mui/material/Paper'
import type {Key, ReactNode} from 'react'

export interface PaginatedListProps<T> {
    /** Rendered above the list, e.g. a result-count summary. */
    header?: ReactNode
    /** Items for the CURRENT page only — this component doesn't slice data,
     * so it works the same whether the caller paginates client-side or
     * fetches one page at a time from the API. */
    items: T[]
    renderItem: (item: T, index: number) => ReactNode
    getItemKey: (item: T, index: number) => Key
    /** 1-based, to match MUI's Pagination. */
    page: number
    pageCount: number
    onPageChange: (page: number) => void
}

// Generic paginated-list shell: header slot + scrollable item list + page
// controls. Knows nothing about what an "item" is — the row itself, and
// what "next page" means (client-side slice vs. server fetch), are the
// caller's concern.
export function PaginatedList<T>({
    header,
    items,
    renderItem,
    getItemKey,
    page,
    pageCount,
    onPageChange,
}: PaginatedListProps<T>) {
    return (
        <Paper
            variant="outlined"
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {header && (
                <Box
                    sx={{
                        // Matches MUI Tabs' default 48px strip height, border
                        // included, so this header lines up with TabbedPanel's
                        // tab strip when the two sit side by side.
                        height: 48,
                        boxSizing: 'border-box',
                        display: 'flex',
                        alignItems: 'center',
                        px: 2.5,
                        borderBottom: 1,
                        borderColor: 'divider',
                    }}
                >
                    {header}
                </Box>
            )}

            <List disablePadding sx={{flex: '1 1 auto', overflowY: 'auto'}}>
                {items.map((item, index) => (
                    <Box key={getItemKey(item, index)}>{renderItem(item, index)}</Box>
                ))}
            </List>

            {pageCount > 1 && (
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        py: 1.5,
                        borderTop: 1,
                        borderColor: 'divider',
                    }}
                >
                    <Pagination
                        count={pageCount}
                        page={page}
                        onChange={(_event, value) => onPageChange(value)}
                        size="small"
                    />
                </Box>
            )}
        </Paper>
    )
}
