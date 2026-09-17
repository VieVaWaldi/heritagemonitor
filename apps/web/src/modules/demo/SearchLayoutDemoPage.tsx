'use client'

import {useState} from 'react'
import Box from '@mui/material/Box'
import {
    FacetSection,
    FacetSidebar,
    FilterBar,
    FilterMenuButton,
    NAVBAR_HEIGHT,
    PaginatedList,
    TabbedPanel,
} from '@/common/components'
import type {FilterOption} from '@/common/components'
import {Text} from '@/common/text'
import {SearchResultRow} from './SearchResultRow'
import {SAMPLE_DELIVERABLES, SAMPLE_PROJECTS} from './sampleSearchResults'

const PAGE_SIZE = 5

// Shared by both the top FilterBar and the FacetSidebar — same facets,
// two surfaces onto the same selection state.
const YEAR_OPTIONS: FilterOption[] = [
    {value: '2024', label: '2024', count: 4},
    {value: '2023', label: '2023', count: 9},
    {value: '2022', label: '2022', count: 14},
    {value: '2021', label: '2021', count: 21},
    {value: '2020', label: '2020', count: 18},
    {value: '2019', label: '2019', count: 12},
    {value: '2018', label: '2018', count: 7},
    {value: '2017', label: '2017', count: 5},
    {value: '2016', label: '2016', count: 3},
]

const DISCIPLINE_OPTIONS: FilterOption[] = [
    {value: 'archaeology', label: 'Archaeology', count: 31},
    {value: 'conservation', label: 'Conservation', count: 27},
    {value: 'physics', label: 'Physics', count: 15},
    {value: 'digital-humanities', label: 'Digital Humanities', count: 22},
    {value: 'engineering', label: 'Engineering', count: 9},
    {value: 'genetics', label: 'Genetics', count: 4},
]

const CORPUS_OPTIONS: FilterOption[] = [
    {value: 'science', label: 'Science', count: 82},
    {value: 'dch', label: 'Digital Cultural Heritage', count: 36},
]

function useFilterState() {
    const [year, setYear] = useState<string[]>([])
    const [discipline, setDiscipline] = useState<string[]>([])
    const [corpus, setCorpus] = useState<string[]>([])
    return {year, setYear, discipline, setDiscipline, corpus, setCorpus}
}

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
    const {year, setYear, discipline, setDiscipline, corpus, setCorpus} = useFilterState()

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
                <FacetSidebar>
                    <FacetSection label="Year" options={YEAR_OPTIONS} value={year} onChange={setYear} />
                    <FacetSection
                        label="Discipline"
                        options={DISCIPLINE_OPTIONS}
                        value={discipline}
                        onChange={setDiscipline}
                    />
                    <FacetSection label="Corpus" options={CORPUS_OPTIONS} value={corpus} onChange={setCorpus} />
                </FacetSidebar>

                <Box sx={{flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2}}>
                    <FilterBar>
                        <FilterMenuButton label="Year" options={YEAR_OPTIONS} value={year} onChange={setYear} />
                        <FilterMenuButton
                            label="Discipline"
                            options={DISCIPLINE_OPTIONS}
                            value={discipline}
                            onChange={setDiscipline}
                        />
                        <FilterMenuButton
                            label="Corpus"
                            options={CORPUS_OPTIONS}
                            value={corpus}
                            onChange={setCorpus}
                        />
                    </FilterBar>

                    <Box sx={{flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 3}}>
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
            </Box>
        </Box>
    )
}
