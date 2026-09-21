'use client'

import {
    PROJECT_FACET_FIELDS,
    PROJECT_SORT_OPTIONS,
    projectDetailSchema,
    projectSearchResponseSchema,
    type ProjectFacetParam,
    type ProjectSearchResponse,
    type ProjectSort,
} from '@heritagemonitor/shared'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import {useCallback, useMemo} from 'react'
import {CORPUSES} from '@/common/catalog'
import {PaginatedList, TabbedPanel} from '@/common/components'
import {buildPageContext} from '@/common/llmchat/pageContext'
import {usePageChatContextPublisher} from '@/common/llmchat/PageChatContext'
import {Text} from '@/common/text'
import {
    readText,
    SEARCH_PARAM,
    useUrlCorpus,
    useUrlFilters,
    useUrlPage,
    useUrlQueryDraft,
    useUrlSort,
    useUrlState,
    useUrlTab,
    useUrlTopics,
    useUrlYears,
} from '@/common/url'
import {EntityResultsPanel} from '../entity/EntityResultsPanel'
import {ResultsHeader} from '../entity/ResultsHeader'
import {describeSearchState} from '../entity/searchState'
import {useEntitySearch} from '../entity/useEntitySearch'
import {useSelectedEntity} from '../entity/useSelectedEntity'
import {ProjectFacetSidebar, ProjectFilterBar, type ProjectFiltersProps} from './ProjectFilters'
import {ProjectOrganisationsTab} from './ProjectOrganisationsTab'
import {ProjectOverviewTab} from './ProjectOverviewTab'
import {ProjectResultRow} from './ProjectResultRow'
import {projectOrganisationsSection, projectSources, selectedProjectSection, summarizeProjectRow} from './projectsChatContext'
import {labelFacetValue, useProjectFacets} from './useProjectFacets'
import {useProjectOrganisations} from './useProjectOrganisations'

// Shown until the first response lands, and kept if a request fails — never a
// flash of "0 results" for a search that is still running. Module-level so
// its identity is stable across renders (useEntitySearch keys on it).
const EMPTY_RESULTS: ProjectSearchResponse = {
    hits: [],
    facetDistribution: {},
    facetLabels: {},
    estimatedTotalHits: 0,
    totalCapped: false,
    approxTotal: null,
    mode: 'strict',
    didYouMean: [],
    page: 1,
    pageCount: 1,
}

const SORT_VALUES = PROJECT_SORT_OPTIONS.map((option) => option.value)
const FILTER_PARAMS = PROJECT_FACET_FIELDS.map((facet) => facet.param)

// `works` is the next slice. This list is what `tab=` is validated against, so
// an unknown tab in a link falls back to the first one rather than to nothing.
const TABS = ['overview', 'organisations'] as const

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
 * corpus, filters, sort, page, selected row, tab and the detail panel's own
 * page all live in the URL (common/url), the data comes from the generic
 * entity hooks, and everything below is presentation — per apps/web/RULES.md #7.
 */
export function ProjectsResultsPanel() {
    const {params} = useUrlState()
    const query = readText(params, SEARCH_PARAM.query)
    const {submit} = useUrlQueryDraft()
    const {corpus} = useUrlCorpus()
    const {sort, setSort} = useUrlSort<ProjectSort>(SORT_VALUES)
    const {page, setPage} = useUrlPage()
    const {tab, setTab} = useUrlTab(TABS)
    const {values: filterValues, setFilter, activeCount} = useUrlFilters<ProjectFacetParam>(FILTER_PARAMS)
    const {years, setYears, setLastNYears, minYear, maxYear} = useUrlYears()
    const {atCap: topicsAtCap, maxTopics} = useUrlTopics()

    const {data, error} = useEntitySearch('projects', projectSearchResponseSchema, EMPTY_RESULTS)
    const {facets, yearHistogram} = useProjectFacets(data.facetDistribution, data.facetLabels)

    const rowIds = useMemo(() => data.hits.map((hit) => hit.id), [data.hits])
    const {selectedId, detail, loading: detailLoading, select} = useSelectedEntity('projects', projectDetailSchema, rowIds)

    const organisationsTabOpen = tab === 'organisations'
    const {
        organisations,
        page: organisationsPage,
        setPage: setOrganisationsPage,
        loading: organisationsLoading,
    } = useProjectOrganisations(selectedId, organisationsTabOpen)

    const hasActiveFilters = activeCount > 0 || years !== null
    const resetFilters = useCallback(() => {
        setYears(null)
        for (const param of FILTER_PARAMS) setFilter(param, [])
    }, [setFilter, setYears])

    const filterProps: ProjectFiltersProps = {
        facets,
        values: filterValues,
        onFilterChange: (param, next) => setFilter(param as ProjectFacetParam, next),
        years,
        onYearsChange: setYears,
        onLastNYears: setLastNYears,
        minYear,
        maxYear,
        yearHistogram,
        topicsAtCap,
        maxTopics,
        onReset: resetFilters,
        hasActiveFilters,
    }

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
                            count: data,
                            entityNoun: 'projects',
                            // Labelled, not raw: a selected topic reaches Lucy
                            // as "Media Influence and Politics", not as the id
                            // "13718" the URL carries.
                            filters: [
                                ...facets.map((facet) => ({
                                    label: facet.config.label,
                                    values: (filterValues[facet.config.param] ?? []).map((value) => labelFacetValue(facet, value)),
                                })),
                                {label: 'Years', values: years ? [`${years.from}-${years.to}`] : []},
                            ],
                            fuzzy: data.mode === 'fuzzy',
                            didYouMean: data.didYouMean,
                        }),
                        rows: data.hits.map(summarizeProjectRow),
                    },
                    ...(detail ? [selectedProjectSection(detail)] : []),
                    ...(detail && organisationsTabOpen
                        ? [projectOrganisationsSection(detail, organisations.hits, organisations.estimatedTotalHits)]
                        : []),
                ],
                sources: projectSources(detail, data.hits, organisationsTabOpen ? organisations.hits : []),
            }),
        [data, query, corpus, sort, detail, facets, filterValues, years, organisationsTabOpen, organisations],
    )
    usePageChatContextPublisher(pageContext)

    return (
        <EntityResultsPanel
            facets={<ProjectFacetSidebar {...filterProps} />}
            filters={<ProjectFilterBar {...filterProps} />}
            notice={
                error ? (
                    <Alert severity="warning">{error}</Alert>
                ) : data.mode === 'fuzzy' ? (
                    // The user's own spelling matched almost nothing, so this
                    // list answers a slightly different question — saying so
                    // is the difference between help and a wrong answer.
                    <Alert severity="info">
                        Few results for <strong>{query}</strong>, showing close matches instead.
                        {data.didYouMean.length > 0 && (
                            <>
                                {' '}
                                Did you mean{' '}
                                {data.didYouMean.map((suggestion, index) => (
                                    <span key={suggestion}>
                                        {index > 0 && ', '}
                                        <Link component="button" type="button" onClick={() => submit(suggestion)}>
                                            {suggestion}
                                        </Link>
                                    </span>
                                ))}
                                ?
                            </>
                        )}
                    </Alert>
                ) : undefined
            }
            list={
                <PaginatedList
                    header={
                        <ResultsHeader
                            count={data}
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
                        {
                            value: 'organisations',
                            label: 'Organisations',
                            content: detail ? (
                                <ProjectOrganisationsTab
                                    organisations={organisations}
                                    page={organisationsPage}
                                    onPageChange={setOrganisationsPage}
                                    loading={organisationsLoading}
                                />
                            ) : (
                                <EmptyTabMessage message="Select a project to see the organisations that worked on it." />
                            ),
                        },
                    ]}
                />
            }
        />
    )
}
