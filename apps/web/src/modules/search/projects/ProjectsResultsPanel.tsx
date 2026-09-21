'use client'

import {
    PROJECT_FACET_FIELDS,
    PROJECT_SORT_OPTIONS,
    PROJECT_YEAR_HISTOGRAM,
    projectDetailSchema,
    projectSearchResponseSchema,
    type ProjectFacetParam,
    type ProjectSearchResponse,
    type ProjectSort,
} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import {useRouter} from 'next/navigation'
import {useCallback, useMemo} from 'react'
import {CORPUSES} from '@/common/catalog'
import {NoticeBar, PaginatedList, TabbedPanel} from '@/common/components'
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
    useUrlTab,
    useUrlTopics,
    useUrlYears,
} from '@/common/url'
import {DeepLinkNotice} from '../entity/DeepLinkNotice'
import {RelatedWorksTab} from '../entity/RelatedWorksTab'
import {TopicsFilterButton} from '../entity/TopicsFilterButton'
import {useTopicNames} from '../entity/useTopicBrowser'
import {projectRelatedLists, relatedLazyContext} from '../entity/relatedContext'
import {useRelatedRequest} from '../entity/useRelatedRequest'
import {useRelatedWorks} from '../entity/useRelatedWorks'
import {EntityFacetSidebar, EntityFilterBar, type EntityFiltersProps} from '../entity/EntityFilters'
import {EntityResultsPanel} from '../entity/EntityResultsPanel'
import {ResultsHeader} from '../entity/ResultsHeader'
import {describeSearchState} from '../entity/searchState'
import {useEntitySearch} from '../entity/useEntitySearch'
import {YearFilter} from '@/common/components'
import {SelectionDroppedNotice} from '../entity/SelectionDroppedNotice'
import {useSelectedEntity} from '../entity/useSelectedEntity'
import {ProjectOrganisationsTab} from './ProjectOrganisationsTab'
import {ProjectOverviewTab} from './ProjectOverviewTab'
import {ProjectResultRow} from './ProjectResultRow'
import {projectOrganisationsSection, projectSources, selectedProjectSection, summarizeProjectRow} from './projectsChatContext'
import {labelFacetValue, useEntityFacets} from '../entity/useEntityFacets'
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

// What `tab=` is validated against: an unknown tab in a link falls back to the
// first one rather than to nothing.
const TABS = ['overview', 'organisations', 'works'] as const

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
    const router = useRouter()
    const {params, update} = useUrlState()
    const query = readText(params, SEARCH_PARAM.query)
    const onlyIds = readList(params, SEARCH_PARAM.only)
    const {submit} = useUrlQueryDraft()
    const {corpus} = useUrlCorpus()
    const {sort, setSort} = useUrlSort<ProjectSort>(SORT_VALUES)
    const {page, setPage} = useUrlPage()
    const {tab, setTab} = useUrlTab(TABS)
    const {values: filterValues, setFilter, activeCount} = useUrlFilters<ProjectFacetParam>(FILTER_PARAMS)
    const {years, setYears, minYear, maxYear} = useUrlYears()
    const {atCap: topicsAtCap, maxTopics} = useUrlTopics()

    const {data, error} = useEntitySearch('projects', projectSearchResponseSchema, EMPTY_RESULTS)
    const facets = useEntityFacets(PROJECT_FACET_FIELDS, data.facetDistribution, data.facetLabels)
    const yearHistogram = useMemo(() => data.facetDistribution[PROJECT_YEAR_HISTOGRAM] ?? {}, [data.facetDistribution])

    // Raw URL values are ids and keys; Lucy should read names. Only the params
    // whose values are not already their own label need translating.
    // Lucy must read "Media Influence and Politics", not "13718". Facet
    // buckets cover the topics currently on screen; the topic table covers the
    // ones picked in the browser, which may not be in any bucket.
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

    const rowIds = useMemo(() => data.hits.map((hit) => hit.id), [data.hits])
    const {selectedId, detail, loading: detailLoading, select, selectionDropped} = useSelectedEntity('projects', projectDetailSchema, rowIds)

    const organisationsTabOpen = tab === 'organisations'
    const worksTabOpen = tab === 'works'
    const {
        organisations,
        page: organisationsPage,
        setPage: setOrganisationsPage,
        loading: organisationsLoading,
    } = useProjectOrganisations(selectedId, organisationsTabOpen)
    const worksRelated = useRelatedRequest('projects:works')
    const {works, page: worksPage, setPage: setWorksPage, loading: worksLoading} = useRelatedWorks(
        'projects',
        selectedId,
        worksTabOpen,
        worksRelated.search,
    )

    const hasActiveFilters = canReset(activeCount > 0 || years !== null, params)
    // Everything the user narrowed with — query text included — in one patch.
    // The entity and the corpus stay: they are the lens, not a filter.
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
        hasActiveFilters,
        // The year control is projects-specific, so it goes in as the facet
        // column's header rather than into the shared facet loop.
        sidebarHeader: (
            <YearFilter value={years} onChange={setYears} min={minYear} max={maxYear} histogram={yearHistogram} />
        ),
        // The sidebar facet is the quick list of the top topics; the browser
        // is how you reach the other 4,000 — so it sits at the head of the
        // Topic card, not at the foot of the column where it was below the fold.
        facetHeaders: {
            topic: (
                <>
                    <TopicsFilterButton entity="projects" countNoun="projects" variant="text" label="Browse all topics" />
                    {topicsAtCap && (
                        <Text variant="caption" color="text.secondary" sx={{display: 'block', px: 1}}>
                            Maximum of {maxTopics} topics selected — clear one to choose another.
                        </Text>
                    )}
                </>
            ),
        },
    }

    // An organisation row on the Organisations tab leads to that organisation
    // in the organisations entity, through the one shared link helper.
    const openOrganisation = useCallback(
        (organisationId: string) => router.push(buildEntityLink({entity: 'organisations', id: organisationId, corpus})),
        [router, corpus],
    )
    const openWork = useCallback(
        (workId: string) => router.push(buildEntityLink({entity: 'works', id: workId, corpus})),
        [router, corpus],
    )

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
                            // Generated from the URL vocabulary, so a filter
                            // added later reaches Lucy without anyone
                            // remembering to add it here. Values are
                            // labelled, not raw: a selected topic arrives as
                            // "Media Influence and Politics", not as "13718".
                            urlParams: describeUrlParams(params, {labelValue: labelUrlValue}),
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
                // The selected entity's related lists, fetched when a message is sent.
                lazy: detail ? relatedLazyContext('project', projectRelatedLists(detail.id, worksRelated.search)) : undefined,
            }),
        [data, query, corpus, sort, detail, params, labelUrlValue, organisationsTabOpen, organisations, worksRelated.search],
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
                        noun="project"
                        onClear={() => update({[SEARCH_PARAM.only]: null, [SEARCH_PARAM.selection]: null})}
                    />
                ) : data.mode === 'fuzzy' ? (
                    // The user's own spelling matched almost nothing, so this
                    // list answers a slightly different question — saying so
                    // is the difference between help and a wrong answer.
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
                                    onSelectOrganisation={openOrganisation}
                                />
                            ) : (
                                <EmptyTabMessage message="Select a project to see the organisations that worked on it." />
                            ),
                        },
                        {
                            value: 'works',
                            label: 'Works',
                            content: detail ? (
                                <RelatedWorksTab
                                    filterCaption={worksRelated.caption}
                                    works={works}
                                    page={worksPage}
                                    onPageChange={setWorksPage}
                                    loading={worksLoading}
                                    onSelectWork={openWork}
                                    emptyMessage="No works are linked to this project."
                                />
                            ) : (
                                <EmptyTabMessage message="Select a project to see its works." />
                            ),
                        },
                    ]}
                />
            }
        />
    )
}
