'use client'

import {useState} from 'react'
import Box from '@mui/material/Box'
import {FacetSection, FilterBar, FilterMenuButton, PaginatedList, TabbedPanel} from '@/common/components'
import {Text} from '@/common/text'
import type {SearchResultRowData} from './SearchResultRow'
import {SearchResultRow} from './SearchResultRow'
import {EntityResultsPanel} from '../entity/EntityResultsPanel'

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
// yet — each UseCase gets its own API endpoint + OpenSearch index later, so
// this renders the real end-state layout with genuinely empty data rather
// than a "coming soon" placeholder.
export function SearchResultsPanel() {
    const items: SearchResultRowData[] = []
    const [year, setYear] = useState<string[]>([])
    const [discipline, setDiscipline] = useState<string[]>([])

    return (
        <EntityResultsPanel
            // Options are empty until each UseCase's own OpenSearch index is
            // wired up — no real facet values to show yet.
            facets={
                <>
                    <FacetSection label="Year" options={[]} value={year} onChange={setYear} />
                    <FacetSection label="Discipline" options={[]} value={discipline} onChange={setDiscipline} />
                </>
            }
            filters={
                <FilterBar>
                    <FilterMenuButton label="Year" options={[]} value={year} onChange={setYear} />
                    <FilterMenuButton label="Discipline" options={[]} value={discipline} onChange={setDiscipline} />
                </FilterBar>
            }
            list={
                <PaginatedList
                    header={<ResultCountHeader count={items.length} noun="results" />}
                    items={items}
                    getItemKey={(item) => item.title}
                    renderItem={(item) => <SearchResultRow {...item} />}
                    page={1}
                    pageCount={1}
                    onPageChange={() => {}}
                />
            }
            detail={
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
            }
        />
    )
}
