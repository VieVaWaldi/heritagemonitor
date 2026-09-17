'use client'

import Box from '@mui/material/Box'
import {PaginatedList, TabbedPanel} from '@/common/components'
import {Text} from '@/common/text'
import type {SearchResultRowData} from './SearchResultRow'
import {SearchResultRow} from './SearchResultRow'

function ResultCountHeader({count, noun}: {count: number; noun: string}) {
    return (
        <Text variant="body2" color="text.secondary">
            About {count} {noun}
        </Text>
    )
}

function EmptyTabMessage({message}: {message: string}) {
    return (
        <Box sx={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Text variant="body2" color="text.secondary">
                {message}
            </Text>
        </Box>
    )
}

// Results list + tabbed detail panel for a /search UseCase. No data hook
// yet — each UseCase gets its own API endpoint + Meilisearch collection
// later, so this renders the real end-state layout with genuinely empty
// data rather than a "coming soon" placeholder.
export function SearchResultsPanel() {
    const items: SearchResultRowData[] = []

    return (
        <Box sx={{width: '80%', mx: 'auto', height: '100%', display: 'flex', gap: 3}}>
            <Box sx={{flex: '1 1 0'}}>
                <PaginatedList
                    header={<ResultCountHeader count={items.length} noun="results" />}
                    items={items}
                    getItemKey={(item) => item.title}
                    renderItem={(item) => <SearchResultRow {...item} />}
                    page={1}
                    pageCount={1}
                    onPageChange={() => {}}
                />
            </Box>

            <Box sx={{flex: '1 1 0'}}>
                <TabbedPanel
                    tabs={[
                        {
                            value: 'overview',
                            label: 'Overview',
                            content: <EmptyTabMessage message="No overview available yet." />,
                        },
                        {
                            value: 'deliverables',
                            label: 'Deliverables',
                            content: (
                                <PaginatedList
                                    header={<ResultCountHeader count={0} noun="deliverables" />}
                                    items={items}
                                    getItemKey={(item) => item.title}
                                    renderItem={(item) => <SearchResultRow {...item} />}
                                    page={1}
                                    pageCount={1}
                                    onPageChange={() => {}}
                                />
                            ),
                        },
                    ]}
                />
            </Box>
        </Box>
    )
}
