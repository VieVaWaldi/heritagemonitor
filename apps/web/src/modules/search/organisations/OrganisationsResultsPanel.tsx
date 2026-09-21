'use client'

import {
    ORGANISATION_FACET_FIELDS,
    ORGANISATION_SORT_OPTIONS,
    organisationDetailSchema,
    organisationSearchResponseSchema,
    type OrganisationFacetParam,
    type OrganisationSearchResponse,
    type OrganisationSort,
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
} from '@/common/url'
import {DeepLinkNotice} from '../entity/DeepLinkNotice'
import {RelatedWorksTab} from '../entity/RelatedWorksTab'
import {organisationRelatedLists, relatedLazyContext} from '../entity/relatedContext'
import {useRelatedRequest} from '../entity/useRelatedRequest'
import {useRelatedWorks} from '../entity/useRelatedWorks'
import {EntityFacetSidebar, EntityFilterBar, type EntityFiltersProps} from '../entity/EntityFilters'
import {EntityResultsPanel} from '../entity/EntityResultsPanel'
import {ResultsHeader} from '../entity/ResultsHeader'
import {describeSearchState, formatResultCount} from '../entity/searchState'
import {useEntityFacets, labelFacetValue} from '../entity/useEntityFacets'
import {useEntitySearch} from '../entity/useEntitySearch'
import {SelectionDroppedNotice} from '../entity/SelectionDroppedNotice'
import {organisationName} from './organisationFormat'
import {useSelectedEntity} from '../entity/useSelectedEntity'
import {OrganisationOverviewTab} from './OrganisationOverviewTab'
import {OrganisationProjectsTab} from './OrganisationProjectsTab'
import {OrganisationResultRow} from './OrganisationResultRow'
import {organisationProjectsSection, organisationSources, selectedOrganisationSection, summarizeOrganisationRow} from './organisationsChatContext'
import {useOrganisationProjects} from './useOrganisationProjects'

const EMPTY_RESULTS: OrganisationSearchResponse = {
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

const SORT_VALUES = ORGANISATION_SORT_OPTIONS.map((option) => option.value)
const FILTER_PARAMS = ORGANISATION_FACET_FIELDS.map((facet) => facet.param)
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
 * The organisations entity of `/search`. Holds no state of its own: query,
 * corpus, filters, sort, page, selected row, tab and the detail panel's own
 * page all live in the URL, the data comes from the generic entity hooks, and
 * everything below is presentation — per apps/web/RULES.md #7.
 */
export function OrganisationsResultsPanel() {
    const router = useRouter()
    const {params, update} = useUrlState()
    const query = readText(params, SEARCH_PARAM.query)
    const onlyIds = readList(params, SEARCH_PARAM.only)
    const {submit} = useUrlQueryDraft()
    const {corpus} = useUrlCorpus()
    const {sort, setSort} = useUrlSort<OrganisationSort>(SORT_VALUES)
    const {page, setPage} = useUrlPage()
    const {tab, setTab} = useUrlTab(TABS)
    const {values: filterValues, setFilter, activeCount} = useUrlFilters<OrganisationFacetParam>(FILTER_PARAMS)

    const {data, error} = useEntitySearch('organisations', organisationSearchResponseSchema, EMPTY_RESULTS)
    const facets = useEntityFacets(ORGANISATION_FACET_FIELDS, data.facetDistribution, data.facetLabels)

    const rowIds = useMemo(() => data.hits.map((hit) => hit.id), [data.hits])
    const {selectedId, detail, loading: detailLoading, select, selectionDropped} = useSelectedEntity('organisations', organisationDetailSchema, rowIds)

    const projectsTabOpen = tab === 'projects'
    const worksTabOpen = tab === 'works'
    // What of this page carries into each tab — see entity/relatedParams.
    const projectsRelated = useRelatedRequest('organisations:projects')
    const worksRelated = useRelatedRequest('organisations:works')

    const {projects, page: projectsPage, setPage: setProjectsPage, loading: projectsLoading} = useOrganisationProjects(
        selectedId,
        projectsTabOpen,
        projectsRelated.search,
    )
    const {works, page: worksPage, setPage: setWorksPage, loading: worksLoading} = useRelatedWorks(
        'organisations',
        selectedId,
        worksTabOpen,
        worksRelated.search,
    )

    const labelUrlValue = useCallback(
        (param: string, value: string) => {
            if (param === SEARCH_PARAM.corpus) return CORPUSES.find((option) => option.key === value)?.fullName ?? value
            const facet = facets.find((candidate) => candidate.config.param === param)
            return facet ? labelFacetValue(facet, value) : value
        },
        [facets],
    )

    // Everything the user narrowed with — query text included — in one patch.
    // The entity and the corpus stay: they are the lens, not a filter.
    const resetFilters = useCallback(
        () => update(buildResetPatch(params, [SEARCH_PARAM.entity, SEARCH_PARAM.corpus])),
        [params, update],
    )

    const filterProps: EntityFiltersProps = {
        entity: 'organisations',
        facets,
        values: filterValues,
        onFilterChange: (param, next) => setFilter(param as OrganisationFacetParam, next),
        onReset: resetFilters,
        hasActiveFilters: canReset(activeCount > 0, params),
    }

    // A project row on the Projects tab leads to that project in the projects
    // entity — the same deep link a project's organisation row uses in the
    // other direction, from the one helper.
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
                            sortLabel: ORGANISATION_SORT_OPTIONS.find((option) => option.value === sort)?.label ?? null,
                            page: data.page,
                            pageCount: data.pageCount,
                            count: data,
                            entityNoun: 'organisations',
                            urlParams: describeUrlParams(params, {labelValue: labelUrlValue}),
                            fuzzy: data.mode === 'fuzzy',
                            didYouMean: data.didYouMean,
                        }),
                        rows: data.hits.map(summarizeOrganisationRow),
                    },
                    ...(detail ? [selectedOrganisationSection(detail)] : []),
                    ...(detail && projectsTabOpen
                        ? [organisationProjectsSection(detail, projects.hits, formatResultCount(projects))]
                        : []),
                ],
                sources: organisationSources(detail, data.hits),
                // The selected entity's related lists, fetched when a message is sent.
                lazy: detail ? relatedLazyContext('organisation', organisationRelatedLists(detail.id, projectsRelated.search, worksRelated.search)) : undefined,
            }),
        [data, query, corpus, sort, detail, params, labelUrlValue, projectsTabOpen, projects, projectsRelated.search, worksRelated.search],
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
                        noun="organisation"
                        names={data.hits.map((hit) => organisationName(hit))}
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
                            noun="organisations"
                            sortOptions={ORGANISATION_SORT_OPTIONS}
                            sort={sort}
                            onSortChange={setSort}
                        />
                    }
                    items={data.hits}
                    getItemKey={(item) => item.id}
                    renderItem={(item) => (
                        <OrganisationResultRow organisation={item} selected={item.id === selectedId} onSelect={select} />
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
                                <OrganisationOverviewTab organisation={detail} />
                            ) : (
                                <EmptyTabMessage message={detailLoading ? 'Loading…' : 'Select an organisation to see its details.'} />
                            ),
                        },
                        {
                            value: 'projects',
                            label: 'Projects',
                            content: detail ? (
                                <OrganisationProjectsTab
                                    filterCaption={projectsRelated.caption}
                                    projects={projects}
                                    page={projectsPage}
                                    onPageChange={setProjectsPage}
                                    loading={projectsLoading}
                                    onSelectProject={openProject}
                                />
                            ) : (
                                <EmptyTabMessage message="Select an organisation to see its projects." />
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
                                    emptyMessage="No works are linked to this organisation."
                                />
                            ) : (
                                <EmptyTabMessage message="Select an organisation to see its works." />
                            ),
                        },
                    ]}
                />
            }
        />
    )
}
