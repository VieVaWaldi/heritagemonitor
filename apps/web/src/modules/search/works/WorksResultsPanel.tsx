'use client'

import {
    OPEN_ACCESS_COLORS,
    WORK_LANGUAGES,
    WORK_SORT_OPTIONS,
    workDetailSchema,
    workSearchResponseSchema,
    type WorkSearchResponse,
    type WorkSort,
} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import {useRouter} from 'next/navigation'
import {useCallback, useMemo} from 'react'
import {CORPUSES} from '@/common/catalog'
import {NoticeBar, PaginatedList, TabbedPanel, YearFilter} from '@/common/components'
import {buildPageContext} from '@/common/llmchat/pageContext'
import {usePageChatContextPublisher} from '@/common/llmchat/PageChatContext'
import {Text} from '@/common/text'
import {
    buildEntityLink,
    buildResetPatch,
    canReset,
    describeUrlParams,
    readList,
    readText,
    SEARCH_PARAM,
    useUrlCorpus,
    useUrlFilters,
    useUrlPage,
    useUrlQueryDraft,
    useUrlSort,
    useUrlState,
    useUrlYears,
} from '@/common/url'
import {DeepLinkNotice} from '../entity/DeepLinkNotice'
import {EntityFacetSidebar, EntityFilterBar, type EntityFiltersProps} from '../entity/EntityFilters'
import {EntityResultsPanel} from '../entity/EntityResultsPanel'
import {ResultsHeader} from '../entity/ResultsHeader'
import {describeSearchState} from '../entity/searchState'
import type {EntityFacet} from '../entity/useEntityFacets'
import {useEntitySearch} from '../entity/useEntitySearch'
import {SelectionDroppedNotice} from '../entity/SelectionDroppedNotice'
import {relatedLazyContext, workRelatedLists} from '../entity/relatedContext'
import {useSelectedEntity} from '../entity/useSelectedEntity'
import {workHiddenTabs, visibleTabs} from '../entity/tabAvailability'
import {useAvailableTab} from '../entity/useAvailableTab'
import {WorkOverviewTab} from './WorkOverviewTab'
import {WorkOrganisationsTab, WorkProjectsTab} from './WorkRelatedTabs'
import {WorkResultRow} from './WorkResultRow'
import {selectedWorkSection, summarizeWorkRow, workSources} from './worksChatContext'
import {useWorkOrganisations, useWorkProjects} from './useWorkRelated'

const EMPTY_RESULTS: WorkSearchResponse = {
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

const SORT_VALUES = WORK_SORT_OPTIONS.map((option) => option.value)
const FILTER_PARAMS = ['oa', 'language', 'publisher'] as const
const TABS = ['overview', 'projects', 'organisations'] as const

/**
 * Works have NO facets: 50M documents on 4 shards means a terms aggregation is
 * a full scan (see the api's works repository). So these are not facet buckets
 * with counts, they are the values the fields can hold, measured once over the
 * whole corpus and shipped as constants in @heritagemonitor/shared.
 *
 * `publisher` is the exception that still needs a server: ~3,000 values, so
 * its menu types against the api's in-memory publisher table.
 */
const WORK_FILTERS: EntityFacet[] = [
    {
        config: {field: 'open_access_color', param: 'oa', label: 'Open access', size: 0, searchable: false},
        options: OPEN_ACCESS_COLORS.map((option) => ({value: option.value, label: option.label})),
    },
    {
        config: {field: 'language', param: 'language', label: 'Language', size: 0, searchable: false},
        options: WORK_LANGUAGES.map((option) => ({value: option.value, label: option.label})),
    },
    {
        config: {field: 'publisher', param: 'publisher', label: 'Publisher', size: 0, searchable: true},
        options: [],
        valuesEndpoint: (searchText) => `/v1/works/publishers?q=${encodeURIComponent(searchText)}`,
    },
]

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
 * The works entity of `/search`. Same generic machinery as the other entities;
 * what differs is what this index can afford — no facet counts, no
 * autocomplete, and a year control with no histogram behind it.
 */
export function WorksResultsPanel() {
    const router = useRouter()
    const {params, update} = useUrlState()
    const query = readText(params, SEARCH_PARAM.query)
    const onlyIds = readList(params, SEARCH_PARAM.only)
    const {submit} = useUrlQueryDraft()
    const {corpus} = useUrlCorpus()
    const {sort, setSort} = useUrlSort<WorkSort>(SORT_VALUES)
    const {page, setPage} = useUrlPage()
    const {values: filterValues, setFilter, activeCount} = useUrlFilters(FILTER_PARAMS)
    const {years, setYears, minYear, maxYear} = useUrlYears()

    const {data, error} = useEntitySearch('works', workSearchResponseSchema, EMPTY_RESULTS)
    const rowIds = useMemo(() => data.hits.map((hit) => hit.id), [data.hits])
    const {selectedId, detail, loading: detailLoading, select, selectionDropped} = useSelectedEntity('works', workDetailSchema, rowIds)
    // Tabs whose list is empty for EVERY user of this document are not shown
    // (see entity/tabAvailability); a list emptied by the page's filters keeps
    // its tab so the caption can explain.
    const hiddenTabs = useMemo(() => workHiddenTabs(detail), [detail])
    const {tab, setTab, available} = useAvailableTab(TABS, hiddenTabs)

    const projectsTabOpen = tab === 'projects'
    const organisationsTabOpen = tab === 'organisations'
    const {projects, page: projectsPage, setPage: setProjectsPage, loading: projectsLoading} = useWorkProjects(
        selectedId,
        projectsTabOpen,
    )
    const {
        organisations,
        page: organisationsPage,
        setPage: setOrganisationsPage,
        loading: organisationsLoading,
    } = useWorkOrganisations(selectedId, organisationsTabOpen)

    const labelUrlValue = useCallback((param: string, value: string) => {
        if (param === SEARCH_PARAM.corpus) return CORPUSES.find((option) => option.key === value)?.fullName ?? value
        const filter = WORK_FILTERS.find((candidate) => candidate.config.param === param)
        return filter?.options.find((option) => option.value === value)?.label ?? value
    }, [])

    const hasActiveFilters = canReset(activeCount > 0 || years !== null, params)
    // Everything the user narrowed with — query text included — in one patch.
    // The entity and the corpus stay: they are the lens, not a filter.
    const resetFilters = useCallback(
        () => update(buildResetPatch(params, [SEARCH_PARAM.entity, SEARCH_PARAM.corpus])),
        [params, update],
    )

    const filterProps: EntityFiltersProps = {
        entity: 'works',
        facets: WORK_FILTERS,
        values: filterValues,
        onFilterChange: (param, next) => setFilter(param as (typeof FILTER_PARAMS)[number], next),
        onReset: resetFilters,
        hasActiveFilters,
        // No histogram: that would be an aggregation, which this index cannot
        // afford. The slider alone still says "these years".
        sidebarHeader: <YearFilter value={years} onChange={setYears} min={minYear} max={maxYear} />,
    }

    const openProject = useCallback(
        (projectId: string) => router.push(buildEntityLink({entity: 'projects', id: projectId, corpus})),
        [router, corpus],
    )
    const openOrganisation = useCallback(
        (organisationId: string) => router.push(buildEntityLink({entity: 'organisations', id: organisationId, corpus})),
        [router, corpus],
    )

    const pageContext = useMemo(
        () =>
            buildPageContext({
                sections: [
                    {
                        heading: describeSearchState({
                            query,
                            corpusName: CORPUSES.find((option) => option.key === corpus)?.fullName ?? corpus,
                            sortLabel: WORK_SORT_OPTIONS.find((option) => option.value === sort)?.label ?? null,
                            page: data.page,
                            pageCount: data.pageCount,
                            count: data,
                            entityNoun: 'works',
                            urlParams: describeUrlParams(params, {labelValue: labelUrlValue}),
                            fuzzy: data.mode === 'fuzzy',
                            didYouMean: data.didYouMean,
                        }),
                        rows: data.hits.map(summarizeWorkRow),
                    },
                    ...(detail ? [selectedWorkSection(detail)] : []),
                ],
                sources: workSources(detail, data.hits),
                // The selected entity's related lists, fetched when a message is sent.
                lazy: detail ? relatedLazyContext('work', workRelatedLists(detail.id), hiddenTabs) : undefined,
            }),
        [data, query, corpus, sort, detail, params, labelUrlValue, hiddenTabs],
    )
    usePageChatContextPublisher(pageContext)

    return (
        <EntityResultsPanel
            facets={<EntityFacetSidebar {...filterProps} />}
            filters={<EntityFilterBar {...filterProps} />}
            notice={
                <>
                <SelectionDroppedNotice show={selectionDropped} />
                {error ? (
                    <NoticeBar tone="warning">{error}</NoticeBar>
                ) : onlyIds.length > 0 ? (
                    <DeepLinkNotice
                        onlyIds={onlyIds}
                        noun="work"
                        onClear={() => update({[SEARCH_PARAM.only]: null, [SEARCH_PARAM.selection]: null})}
                    />
                ) : data.mode === 'fuzzy' ? (
                    <NoticeBar tone="note">
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
                    </NoticeBar>
                ) : undefined}
                </>
            }
            list={
                <PaginatedList
                    header={
                        <ResultsHeader
                            count={data}
                            noun="works"
                            sortOptions={WORK_SORT_OPTIONS}
                            sort={sort}
                            onSortChange={setSort}
                        />
                    }
                    items={data.hits}
                    getItemKey={(item) => item.id}
                    renderItem={(item) => <WorkResultRow work={item} selected={item.id === selectedId} onSelect={select} />}
                    page={page}
                    pageCount={data.pageCount}
                    onPageChange={setPage}
                />
            }
            detail={
                <TabbedPanel
                    value={tab}
                    onChange={(next) => setTab(next as (typeof TABS)[number])}
                    tabs={visibleTabs([
                        {
                            value: 'overview',
                            label: 'Overview',
                            content: detail ? (
                                <WorkOverviewTab work={detail} />
                            ) : (
                                <EmptyTabMessage message={detailLoading ? 'Loading…' : 'Select a work to see its details.'} />
                            ),
                        },
                        {
                            value: 'projects',
                            label: 'Projects',
                            content: detail ? (
                                <WorkProjectsTab
                                    projects={projects}
                                    page={projectsPage}
                                    onPageChange={setProjectsPage}
                                    loading={projectsLoading}
                                    onSelectProject={openProject}
                                />
                            ) : (
                                <EmptyTabMessage message="Select a work to see its projects." />
                            ),
                        },
                        {
                            value: 'organisations',
                            label: 'Organisations',
                            content: detail ? (
                                <WorkOrganisationsTab
                                    organisations={organisations}
                                    page={organisationsPage}
                                    onPageChange={setOrganisationsPage}
                                    loading={organisationsLoading}
                                    onSelectOrganisation={openOrganisation}
                                />
                            ) : (
                                <EmptyTabMessage message="Select a work to see its organisations." />
                            ),
                        },
                    ], available)}
                />
            }
        />
    )
}
