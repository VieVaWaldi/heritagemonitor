'use client'

import {useState} from 'react'
import Box from '@mui/material/Box'
import {NAVBAR_HEIGHT, PaginatedList, TabbedPanel} from '@/common/components'
import {Text} from '@/common/text'
import {SearchResultRow} from './SearchResultRow'
import {SAMPLE_DELIVERABLES, SAMPLE_PROJECTS} from './sampleSearchResults'

const PAGE_SIZE = 5

function usePagedItems<T>(items: T[], pageSize: number) {
    const [page, setPage] = useState(1)
    const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
    const pageItems = items.slice((page - 1) * pageSize, page * pageSize)
    return {page, pageCount, pageItems, setPage}
}

function ResultCountHeader({count, noun}: {count: number; noun: string}) {
    return (
        <Text variant="body2" color="text.secondary">
            About {count} {noun}
        </Text>
    )
}

function DeliverablesTabContent() {
    const {page, pageCount, pageItems, setPage} = usePagedItems(SAMPLE_DELIVERABLES, PAGE_SIZE)
    return (
        <PaginatedList
            header={<ResultCountHeader count={SAMPLE_DELIVERABLES.length} noun="deliverables" />}
            items={pageItems}
            getItemKey={(item) => item.title}
            renderItem={(item) => <SearchResultRow {...item} />}
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
        />
    )
}

// Demo/sandbox for the future /search results layout: a paginated results
// list on the left, a tabbed detail panel on the right. Sample data only —
// SearchResultRow and the sample datasets move to modules/search once this
// wires up to the real API.
export function SearchLayoutDemoPage() {
    const {page, pageCount, pageItems, setPage} = usePagedItems(SAMPLE_PROJECTS, PAGE_SIZE)

    return (
        <Box sx={{p: 4}}>
            <Box
                sx={{
                    width: '80%',
                    mx: 'auto',
                    height: `calc(100dvh - ${NAVBAR_HEIGHT}px - 64px)`,
                    display: 'flex',
                    gap: 3,
                }}
            >
                <Box sx={{flex: '1 1 0'}}>
                    <PaginatedList
                        header={<ResultCountHeader count={SAMPLE_PROJECTS.length} noun="projects" />}
                        items={pageItems}
                        getItemKey={(item) => item.title}
                        renderItem={(item) => <SearchResultRow {...item} />}
                        page={page}
                        pageCount={pageCount}
                        onPageChange={setPage}
                    />
                </Box>

                <Box sx={{flex: '1 1 0'}}>
                    <TabbedPanel
                        tabs={[
                            {
                                value: 'overview',
                                label: 'Overview',
                                content: (
                                    <Box
                                        sx={{
                                            height: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Text variant="body2" color="text.secondary">
                                            No overview available yet.
                                        </Text>
                                    </Box>
                                ),
                            },
                            {
                                value: 'deliverables',
                                label: 'Deliverables',
                                content: <DeliverablesTabContent />,
                            },
                        ]}
                    />
                </Box>
            </Box>
        </Box>
    )
}
