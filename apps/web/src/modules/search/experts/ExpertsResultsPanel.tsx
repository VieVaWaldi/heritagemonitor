'use client'

import {
    EXPERT_LIST_LIMIT,
    EXPERT_SORT_OPTIONS,
    PROJECT_FACET_FIELDS,
    PROJECT_YEAR_HISTOGRAM,
    expertSearchResponseSchema,
    organisationDetailSchema,
    projectSearchResponseSchema,
    workCountResponseSchema,
    workSearchResponseSchema,
    type ExpertSearchResponse,
    type ExpertSort,
    type ProjectFacetParam,
    type ProjectSearchResponse,
    type WorkSearchResponse,
} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import {useRouter} from 'next/navigation'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {apiGet} from '@/common/api/apiClient'
import {CORPUSES} from '@/common/catalog'
import {NoticeBar, PaginatedList, TabbedPanel, YearFilter} from '@/common/components'
import {buildPageContext} from '@/common/llmchat/pageContext'
import {usePageChatContextPublisher} from '@/common/llmchat/PageChatContext'
import {Text} from '@/common/text'
import {
    buildEntityLink,
    buildResetPatch,
    describeUrlParams,
    readText,
    SEARCH_PARAM,
    toApiSearchParams,
    useUrlCorpus,
    useUrlFilters,
    useUrlPage,
    useUrlQueryDraft,
    useUrlSort,
    useUrlState,
    useUrlTab,
    useUrlYears,
} from '@/common/url'
import {EntityFacetSidebar, EntityFilterBar, type EntityFiltersProps} from '../entity/EntityFilters'
import {EntityResultsPanel} from '../entity/EntityResultsPanel'
import {RelatedList, type RelatedRow} from '../entity/RelatedList'
import {ResultsHeader} from '../entity/ResultsHeader'
import {TopicsFilterButton} from '../entity/TopicsFilterButton'
import {describeSearchState, formatResultCount} from '../entity/searchState'
import {useEntityFacets, labelFacetValue} from '../entity/useEntityFacets'
import {useEntitySearch} from '../entity/useEntitySearch'
import {useRelatedSearch} from '../entity/useRelatedSearch'
import {useSelectedEntity} from '../entity/useSelectedEntity'
import {useTopicNames} from '../entity/useTopicBrowser'
import {OrganisationOverviewTab} from '../organisations/OrganisationOverviewTab'
import {ExpertResultRow} from './ExpertResultRow'
import {expertSources, selectedExpertSection, summarizeExpertRow} from './expertsChatContext'

const EMPTY_RESULTS: ExpertSearchResponse = {
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
    rankedOrganisations: 0,
    listCapped: false,
}
const EMPTY_PROJECTS: ProjectSearchResponse = {...EMPTY_RESULTS, hits: []}
const EMPTY_WORKS: WorkSearchResponse = {...EMPTY_RESULTS, hits: []}

const SORT_VALUES = EXPERT_SORT_OPTIONS.map((option) => option.value)
// The same filters as projects: they narrow the projects, and the experts
// follow from those.
const FILTER_PARAMS = PROJECT_FACET_FIELDS.map((facet) => facet.param)
const TABS = ['overview', 'projects', 'works'] as const

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
 * Find Experts. There is no experts index (decision D9): the question "who
 * works on this" is answered by searching PROJECTS and ranking the
 * organisations behind the matches — so every filter on this page is a
 * project filter, and the same generic entity layer carries it.
 *
 * "Expert" means an organisation, never a person: this platform holds no
 * individual-level data, and the UI and the chat context both say so.
 */
export function ExpertsResultsPanel() {
    const router = useRouter()
    const {params, update} = useUrlState()
    const query = readText(params, SEARCH_PARAM.query)
    const apiParams = toApiSearchParams(params)
    const {submit} = useUrlQueryDraft()
    const {corpus} = useUrlCorpus()
    const {sort, setSort} = useUrlSort<ExpertSort>(SORT_VALUES)
    const {page, setPage} = useUrlPage()
    const {tab, setTab} = useUrlTab(TABS)
    const {values: filterValues, setFilter, activeCount} = useUrlFilters<ProjectFacetParam>(FILTER_PARAMS)
    const {years, setYears, minYear, maxYear} = useUrlYears()

    const {data, error} = useEntitySearch('experts', expertSearchResponseSchema, EMPTY_RESULTS)
    const facets = useEntityFacets(PROJECT_FACET_FIELDS, data.facetDistribution, data.facetLabels)
    const yearHistogram = useMemo(() => data.facetDistribution[PROJECT_YEAR_HISTOGRAM] ?? {}, [data.facetDistribution])

    const rowIds = useMemo(() => data.hits.map((hit) => hit.id), [data.hits])
    // An expert IS an organisation, so the detail panel reads the
    // organisations endpoint rather than a parallel experts one.
    const {selectedId, detail, loading: detailLoading, select} = useSelectedEntity('organisations', organisationDetailSchema, rowIds)
    const selectedRow = data.hits.find((hit) => hit.id === selectedId) ?? null

    // The matching projects, not all of this organisation's: the same query
    // and filters plus `org=<id>`, so the tab answers "what did they do that
    // I was looking for".
    const projectsTab = useRelatedSearch({
        key: selectedId,
        path: (dpage) => `/v1/projects/search?${apiParams}&org=${encodeURIComponent(selectedId ?? '')}&page=${dpage}`,
        schema: projectSearchResponseSchema,
        empty: EMPTY_PROJECTS,
        enabled: tab === 'projects',
    })
    // The publications tab answers "what did they publish about THIS" by
    // default — the same text the expert ranking used — with an explicit way
    // to widen it to everything they ever published. The toggle is its own URL
    // param so it never touches the page's `q`.
    const showAllWorks = params.get(SEARCH_PARAM.allWorks) === '1'
    const worksQuery = showAllWorks ? '' : query
    const worksTab = useRelatedSearch({
        key: selectedId ? `${selectedId}:${worksQuery}` : null,
        path: (dpage) =>
            `/v1/organisations/${encodeURIComponent(selectedId ?? '')}/works?page=${dpage}&c=${encodeURIComponent(corpus)}` +
            (worksQuery ? `&q=${encodeURIComponent(worksQuery)}` : ''),
        schema: workSearchResponseSchema,
        empty: EMPTY_WORKS,
        enabled: tab === 'works',
    })

    // "About K of its publications match your text", wanted on the Overview
    // WITHOUT opening the tab. Best effort: the api answers null on timeout
    // and the line simply omits the number.
    const [matchingWorks, setMatchingWorks] = useState<{key: string; count: number | null} | null>(null)
    useEffect(() => {
        if (!selectedId || !query) return
        const controller = new AbortController()
        const key = `${selectedId}:${query}:${corpus}`
        apiGet(
            `/v1/organisations/${encodeURIComponent(selectedId)}/works/count?q=${encodeURIComponent(query)}&c=${encodeURIComponent(corpus)}`,
            workCountResponseSchema,
            {signal: controller.signal},
        )
            .then((response) => setMatchingWorks({key, count: response.count}))
            .catch(() => {})
        return () => controller.abort()
    }, [selectedId, query, corpus])
    const matchingWorksCount =
        selectedId && query && matchingWorks?.key === `${selectedId}:${query}:${corpus}` ? matchingWorks.count : null

    const topicName = useTopicNames()
    const labelUrlValue = useCallback(
        (param: string, value: string) => {
            if (param === SEARCH_PARAM.corpus) return CORPUSES.find((option) => option.key === value)?.fullName ?? value
            if (param === 'topic' || param === 'subfield' || param === 'field') return topicName(param, value)
            const facet = facets.find((candidate) => candidate.config.param === param)
            return facet ? labelFacetValue(facet, value) : value
        },
        [facets, topicName],
    )

    const resetFilters = useCallback(
        () => update(buildResetPatch(params, [SEARCH_PARAM.entity, SEARCH_PARAM.corpus])),
        [params, update],
    )

    const filterProps: EntityFiltersProps = {
        entity: 'projects',
        facets,
        values: filterValues,
        onFilterChange: (param, next) => setFilter(param as ProjectFacetParam, next),
        onReset: resetFilters,
        hasActiveFilters: activeCount > 0 || years !== null,
        sidebarHeader: <YearFilter value={years} onChange={setYears} min={minYear} max={maxYear} histogram={yearHistogram} />,
        sidebarFooter: <TopicsFilterButton entity="experts" countNoun="projects" variant="text" label="Browse all topics" />,
        filterBarExtra: <TopicsFilterButton entity="experts" countNoun="projects" />,
    }

    const openOrganisation = useCallback(
        (organisationId: string) => router.push(buildEntityLink({entity: 'organisations', id: organisationId, corpus})),
        [router, corpus],
    )
    const openProject = useCallback(
        (projectId: string) => router.push(buildEntityLink({entity: 'projects', id: projectId, corpus})),
        [router, corpus],
    )
    const openWork = useCallback(
        (workId: string) => router.push(buildEntityLink({entity: 'works', id: workId, corpus})),
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
                            sortLabel: EXPERT_SORT_OPTIONS.find((option) => option.value === sort)?.label ?? null,
                            page: data.page,
                            pageCount: data.pageCount,
                            count: data,
                            entityNoun: 'organisations working on this',
                            urlParams: describeUrlParams(params, {labelValue: labelUrlValue}),
                            fuzzy: data.mode === 'fuzzy',
                            didYouMean: data.didYouMean,
                        }),
                        rows: data.hits.map(summarizeExpertRow),
                    },
                    ...(detail ? [selectedExpertSection(detail, selectedRow?.matchedProjects ?? null)] : []),
                ],
                sources: expertSources(detail, data.hits),
            }),
        [data, query, corpus, sort, detail, selectedRow, params, labelUrlValue],
    )
    usePageChatContextPublisher(pageContext)

    const projectRows: RelatedRow[] = projectsTab.data.hits.map((project) => ({
        id: project.id,
        primary: project.acronym && project.title ? `${project.acronym} — ${project.title}` : (project.title ?? project.id),
        secondary: [project.year != null ? String(project.year) : null, [...project.funder, ...project.programme].join(' / ') || null]
            .filter(Boolean)
            .join(' · '),
    }))
    const workRows: RelatedRow[] = worksTab.data.hits.map((work) => ({
        id: work.id,
        primary: work.title ?? work.id,
        secondary: [work.year != null ? String(work.year) : null, work.container_name, `${work.citation_count ?? 0} citations`]
            .filter(Boolean)
            .join(' · '),
    }))

    return (
        <EntityResultsPanel
            facets={<EntityFacetSidebar {...filterProps} />}
            filters={<EntityFilterBar {...filterProps} />}
            notice={
                error ? (
                    <NoticeBar tone="warning">{error}</NoticeBar>
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
                ) : data.listCapped ? (
                    // The ranking is a terms aggregation with a size: beyond
                    // the top few hundred there is nothing to page into, and
                    // saying so is better than an empty page 11.
                    <NoticeBar tone="note">
                        Ranking the top {EXPERT_LIST_LIMIT} organisations of about{' '}
                        {data.estimatedTotalHits.toLocaleString('en-US')} that worked on matching projects. Narrow the search
                        to rank further down.
                    </NoticeBar>
                ) : undefined
            }
            list={
                <PaginatedList
                    header={
                        <ResultsHeader
                            count={data}
                            noun="organisations"
                            sortOptions={EXPERT_SORT_OPTIONS}
                            sort={sort}
                            onSortChange={setSort}
                        />
                    }
                    items={data.hits}
                    getItemKey={(item) => item.id}
                    renderItem={(item) => (
                        <ExpertResultRow expert={item} selected={item.id === selectedId} onSelect={select} />
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
                                <Box>
                                    {selectedRow && (
                                        <Box sx={{px: 2.5, pt: 2.5}}>
                                            <NoticeBar tone="note">
                                                {selectedRow.matchedProjects.toLocaleString('en-US')} of this
                                                organisation&apos;s {(selectedRow.project_count ?? 0).toLocaleString('en-US')}{' '}
                                                projects match your search
                                                {matchingWorksCount != null
                                                    ? `, and about ${matchingWorksCount.toLocaleString('en-US')} of its publications match your search text`
                                                    : ''}
                                                .
                                                {selectedRow.mergedRecords > 1
                                                    ? ` ${selectedRow.mergedRecords} duplicate index records were merged into this row.`
                                                    : ''}
                                            </NoticeBar>
                                        </Box>
                                    )}
                                    {/* The same overview the organisations
                                        entity shows — one component, one
                                        definition of what an organisation is. */}
                                    <OrganisationOverviewTab organisation={detail} />
                                    <Box sx={{px: 2.5, pb: 2.5}}>
                                        <Link component="button" type="button" onClick={() => openOrganisation(detail.id)}>
                                            Open this organisation in the organisations search
                                        </Link>
                                    </Box>
                                </Box>
                            ) : (
                                <EmptyTabMessage message={detailLoading ? 'Loading…' : 'Select an organisation to see its details.'} />
                            ),
                        },
                        {
                            value: 'projects',
                            label: 'Matching projects',
                            content: detail ? (
                                <RelatedList
                                    caption={`${formatResultCount(projectsTab.data)} of this organisation's projects match your search`}
                                    rows={projectRows}
                                    page={projectsTab.page}
                                    pageCount={projectsTab.data.pageCount}
                                    onPageChange={projectsTab.setPage}
                                    loading={projectsTab.loading}
                                    emptyMessage="None of this organisation's projects match the current search."
                                    onSelect={openProject}
                                />
                            ) : (
                                <EmptyTabMessage message="Select an organisation to see its matching projects." />
                            ),
                        },
                        {
                            value: 'works',
                            label: 'Publications',
                            content: detail ? (
                                <Box sx={{height: '100%', display: 'flex', flexDirection: 'column'}}>
                                    <Box sx={{px: 2.5, pt: 1.5}}>
                                        <Chip
                                            size="small"
                                            variant={showAllWorks ? 'filled' : 'outlined'}
                                            color={showAllWorks ? 'primary' : 'default'}
                                            label={
                                                showAllWorks
                                                    ? 'Showing all publications — click to show only matching'
                                                    : 'Show all publications of this organisation'
                                            }
                                            onClick={() => update({[SEARCH_PARAM.allWorks]: showAllWorks ? null : '1'})}
                                            disabled={!query}
                                        />
                                    </Box>
                                    <Box sx={{flex: '1 1 auto', minHeight: 0}}>
                                <RelatedList
                                    caption={
                                        worksQuery
                                            ? `${formatResultCount(worksTab.data)} publications matching "${worksQuery}" in title, authors or venue — the projects above are matched separately, on their own text`
                                            : `${formatResultCount(worksTab.data)} publications, most cited first (all of them, not only the matching ones)`
                                    }
                                    rows={workRows}
                                    page={worksTab.page}
                                    pageCount={worksTab.data.pageCount}
                                    onPageChange={worksTab.setPage}
                                    loading={worksTab.loading}
                                    emptyMessage={
                                        worksQuery
                                            ? 'None of this organisation\u2019s publications match your search text.'
                                            : 'No publications are linked to this organisation.'
                                    }
                                    onSelect={openWork}
                                />
                                    </Box>
                                </Box>
                            ) : (
                                <EmptyTabMessage message="Select an organisation to see its publications." />
                            ),
                        },
                    ]}
                />
            }
        />
    )
}
