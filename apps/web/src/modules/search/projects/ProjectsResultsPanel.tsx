'use client'

import {
    PROJECT_SORT_OPTIONS,
    projectDetailSchema,
    projectSearchResponseSchema,
    type ProjectSearchResponse,
    type ProjectSort,
} from '@heritagemonitor/shared'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import {useMemo} from 'react'
import {CORPUSES} from '@/common/catalog'
import {PaginatedList, TabbedPanel} from '@/common/components'
import {buildPageContext} from '@/common/llmchat/pageContext'
import {usePageChatContextPublisher} from '@/common/llmchat/PageChatContext'
import {Text} from '@/common/text'
import {readText, SEARCH_PARAM, useUrlCorpus, useUrlPage, useUrlSort, useUrlState, useUrlTab} from '@/common/url'
import {EntityResultsPanel} from '../entity/EntityResultsPanel'
import {ResultsHeader} from '../entity/ResultsHeader'
import {describeSearchState} from '../entity/searchState'
import {useEntitySearch} from '../entity/useEntitySearch'
import {useSelectedEntity} from '../entity/useSelectedEntity'
import {ProjectOverviewTab} from './ProjectOverviewTab'
import {ProjectResultRow} from './ProjectResultRow'
import {projectSources, selectedProjectSection, summarizeProjectRow} from './projectsChatContext'

// Shown until the first response lands, and kept if a request fails — never a
// flash of "0 results" for a search that is still running. Module-level so
// its identity is stable across renders (useEntitySearch keys on it).
const EMPTY_RESULTS: ProjectSearchResponse = {
    hits: [],
    facetDistribution: {},
    facetLabels: {},
    estimatedTotalHits: 0,
    totalCapped: false,
    page: 1,
    pageCount: 1,
}

const SORT_VALUES = PROJECT_SORT_OPTIONS.map((option) => option.value)

// Only the overview exists in this step; `organisations` and `works` are the
// next slice. The list is what `tab=` is validated against, so an unknown tab
// in a link falls back to the first one rather than showing nothing.
const TABS = ['overview'] as const

function EmptyTabMessage({message}: {message: string}) {
    return (
        <Box sx={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2.5}}>
            <Text variant="body2" color="text.secondary" sx={{textAlign: 'center'}}>
                {message}
            </Text>
        </Box>
    )
}

/**
 * The projects entity of `/search`. Holds no state of its own: the query,
 * corpus, sort, page, selected row and tab all live in the URL (common/url),
 * the data comes from the generic entity hooks, and everything below is
 * presentation — per apps/web/RULES.md #7.
 */
export function ProjectsResultsPanel() {
    const {params} = useUrlState()
    const query = readText(params, SEARCH_PARAM.query)
    const {corpus} = useUrlCorpus()
    const {sort, setSort} = useUrlSort<ProjectSort>(SORT_VALUES)
    const {page, setPage} = useUrlPage()
    const {tab, setTab} = useUrlTab(TABS)

    const {data, error} = useEntitySearch('projects', projectSearchResponseSchema, EMPTY_RESULTS)
    const rowIds = useMemo(() => data.hits.map((hit) => hit.id), [data.hits])
    const {selectedId, detail, loading: detailLoading, select} = useSelectedEntity('projects', projectDetailSchema, rowIds)

    // Memoized so usePageChatContextPublisher's effect only re-publishes when
    // the content actually changes, not on every unrelated render.
    const pageContext = useMemo(
        () =>
            buildPageContext({
                sections: [
                    {
                        heading: describeSearchState({
                            query,
                            corpusName: CORPUSES.find((option) => option.key === corpus)?.fullName ?? corpus,
                            sortLabel: PROJECT_SORT_OPTIONS.find((option) => option.value === sort)?.label ?? null,
                            page: data.page,
                            pageCount: data.pageCount,
                            total: data.estimatedTotalHits,
                            totalCapped: data.totalCapped,
                            entityNoun: 'projects',
                        }),
                        rows: data.hits.map(summarizeProjectRow),
                    },
                    ...(detail ? [selectedProjectSection(detail)] : []),
                ],
                sources: projectSources(detail, data.hits),
            }),
        [data, query, corpus, sort, detail],
    )
    usePageChatContextPublisher(pageContext)

    return (
        <EntityResultsPanel
            notice={error ? <Alert severity="warning">{error}</Alert> : undefined}
            list={
                <PaginatedList
                    header={
                        <ResultsHeader
                            total={data.estimatedTotalHits}
                            totalCapped={data.totalCapped}
                            noun="projects"
                            sortOptions={PROJECT_SORT_OPTIONS}
                            sort={sort}
                            onSortChange={setSort}
                        />
                    }
                    items={data.hits}
                    getItemKey={(item) => item.id}
                    renderItem={(item) => (
                        <ProjectResultRow project={item} selected={item.id === selectedId} onSelect={select} />
                    )}
                    page={page}
                    pageCount={data.pageCount}
                    onPageChange={setPage}
                />
            }
            detail={
                <TabbedPanel
                    value={tab}
                    onChange={(next) => setTab(next as (typeof TABS)[number])}
                    tabs={[
                        {
                            value: 'overview',
                            label: 'Overview',
                            content: detail ? (
                                <ProjectOverviewTab project={detail} />
                            ) : (
                                <EmptyTabMessage
                                    message={detailLoading ? 'Loading…' : 'Select a project to see its details.'}
                                />
                            ),
                        },
                    ]}
                />
            }
        />
    )
}
