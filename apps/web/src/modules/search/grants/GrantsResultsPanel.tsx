'use client'

import {
    GRANT_FACET_FIELDS,
    GRANT_SORT_OPTIONS,
    grantDetailSchema,
    grantSearchResponseSchema,
    type GrantFacetParam,
    type GrantSearchResponse,
    type GrantSort,
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
import {EntityFacetSidebar, EntityFilterBar, type EntityFiltersProps} from '../entity/EntityFilters'
import {EntityResultsPanel} from '../entity/EntityResultsPanel'
import {ResultsHeader} from '../entity/ResultsHeader'
import {describeSearchState, formatResultCount} from '../entity/searchState'
import {labelFacetValue, useEntityFacets} from '../entity/useEntityFacets'
import {useEntitySearch} from '../entity/useEntitySearch'
import {useRelatedRequest} from '../entity/useRelatedRequest'
import {useSelectedEntity} from '../entity/useSelectedEntity'
import {GrantOrganisationsTab} from './GrantOrganisationsTab'
import {GrantOverviewTab} from './GrantOverviewTab'
import {GrantProjectsTab} from './GrantProjectsTab'
import {GrantResultRow} from './GrantResultRow'
import {grantOrganisationsSection, grantProjectsSection, selectedGrantSection, summarizeGrantRow} from './grantsChatContext'
import {useGrantOrganisations} from './useGrantOrganisations'
import {useGrantProjects} from './useGrantProjects'

const EMPTY_RESULTS: GrantSearchResponse = {
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

const SORT_VALUES = GRANT_SORT_OPTIONS.map((option) => option.value)
const FILTER_PARAMS = GRANT_FACET_FIELDS.map((facet) => facet.param)
const TABS = ['overview', 'projects', 'organisations'] as const

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
 * The grants entity of `/search`: the funding streams projects were paid from.
 *
 * Holds no state of its own — query, corpus, filters, sort, page, selected
 * stream, tab and the detail panel's own page all live in the URL, the data
 * comes from the generic entity hooks, and everything below is presentation
 * (apps/web/RULES.md #7).
 */
export function GrantsResultsPanel() {
    const router = useRouter()
    const {params, update} = useUrlState()
    const query = readText(params, SEARCH_PARAM.query)
    const onlyIds = readList(params, SEARCH_PARAM.only)
    const {submit} = useUrlQueryDraft()
    const {corpus} = useUrlCorpus()
    const {sort, setSort} = useUrlSort<GrantSort>(SORT_VALUES)
    const {page, setPage} = useUrlPage()
    const {tab, setTab} = useUrlTab(TABS)
    const {values: filterValues, setFilter, activeCount} = useUrlFilters<GrantFacetParam>(FILTER_PARAMS)

    const {data, error} = useEntitySearch('grants', grantSearchResponseSchema, EMPTY_RESULTS)
    const facets = useEntityFacets(GRANT_FACET_FIELDS, data.facetDistribution, data.facetLabels)

    const rowIds = useMemo(() => data.hits.map((hit) => hit.id), [data.hits])
    const {selectedId, detail, loading: detailLoading, select} = useSelectedEntity('grants', grantDetailSchema, rowIds)

    const projectsTabOpen = tab === 'projects'
    const organisationsTabOpen = tab === 'organisations'
    const projectsRelated = useRelatedRequest('grants:projects')
    const organisationsRelated = useRelatedRequest('grants:organisations')

    const {projects, page: projectsPage, setPage: setProjectsPage, loading: projectsLoading} = useGrantProjects(
        selectedId,
        corpus,
        projectsTabOpen,
        projectsRelated.search,
    )
    const {organisations, complete: organisationsComplete, loading: organisationsLoading} = useGrantOrganisations(
        selectedId,
        corpus,
        organisationsTabOpen,
        organisationsRelated.search,
    )

    const labelUrlValue = useCallback(
        (param: string, value: string) => {
            if (param === SEARCH_PARAM.corpus) return CORPUSES.find((option) => option.key === value)?.fullName ?? value
            const facet = facets.find((candidate) => candidate.config.param === param)
            return facet ? labelFacetValue(facet, value) : value
        },
        [facets],
    )

    const resetFilters = useCallback(
        () => update(buildResetPatch(params, [SEARCH_PARAM.entity, SEARCH_PARAM.corpus])),
        [params, update],
    )

    const filterProps: EntityFiltersProps = {
        entity: 'grants',
        facets,
        values: filterValues,
        onFilterChange: (param, next) => setFilter(param as GrantFacetParam, next),
        onReset: resetFilters,
        hasActiveFilters: activeCount > 0,
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
                            sortLabel: GRANT_SORT_OPTIONS.find((option) => option.value === sort)?.label ?? null,
                            page: data.page,
                            pageCount: data.pageCount,
                            count: data,
                            entityNoun: 'funding streams',
                            urlParams: describeUrlParams(params, {labelValue: labelUrlValue}),
                            fuzzy: data.mode === 'fuzzy',
                            didYouMean: data.didYouMean,
                        }),
                        rows: data.hits.map(summarizeGrantRow),
                    },
                    ...(detail ? [selectedGrantSection(detail)] : []),
                    ...(detail && projectsTabOpen ? [grantProjectsSection(detail, projects.hits, formatResultCount(projects))] : []),
                    ...(detail && organisationsTabOpen ? [grantOrganisationsSection(detail, organisations)] : []),
                ],
                // No sources: the grants index carries no URL for a stream, so
                // there is nothing Lucy could be allowed to fetch.
                sources: [],
            }),
        [data, query, corpus, sort, detail, params, labelUrlValue, projectsTabOpen, projects, organisationsTabOpen, organisations],
    )
    usePageChatContextPublisher(pageContext)

    return (
        <EntityResultsPanel
            facets={<EntityFacetSidebar {...filterProps} />}
            filters={<EntityFilterBar {...filterProps} />}
            notice={
                error ? (
                    <NoticeBar tone="warning">{error}</NoticeBar>
                ) : onlyIds.length > 0 ? (
                    <DeepLinkNotice
                        onlyIds={onlyIds}
                        noun="funding stream"
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
                ) : undefined
            }
            list={
                <PaginatedList
                    header={
                        <ResultsHeader
                            count={data}
                            noun="funding streams"
                            sortOptions={GRANT_SORT_OPTIONS}
                            sort={sort}
                            onSortChange={setSort}
                        />
                    }
                    items={data.hits}
                    getItemKey={(item) => item.id}
                    renderItem={(item) => <GrantResultRow grant={item} selected={item.id === selectedId} onSelect={select} />}
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
                                <GrantOverviewTab grant={detail} />
                            ) : (
                                <EmptyTabMessage message={detailLoading ? 'Loading…' : 'Select a funding stream to see its details.'} />
                            ),
                        },
                        {
                            value: 'projects',
                            label: 'Projects',
                            content: detail ? (
                                <GrantProjectsTab
                                    filterCaption={projectsRelated.caption}
                                    projects={projects}
                                    page={projectsPage}
                                    onPageChange={setProjectsPage}
                                    loading={projectsLoading}
                                    onSelectProject={openProject}
                                />
                            ) : (
                                <EmptyTabMessage message="Select a funding stream to see its projects." />
                            ),
                        },
                        {
                            value: 'organisations',
                            label: 'Organisations',
                            content: detail ? (
                                <GrantOrganisationsTab
                                    filterCaption={organisationsRelated.caption}
                                    organisations={organisations}
                                    complete={organisationsComplete}
                                    loading={organisationsLoading}
                                    onSelectOrganisation={openOrganisation}
                                />
                            ) : (
                                <EmptyTabMessage message="Select a funding stream to see the organisations behind it." />
                            ),
                        },
                    ]}
                />
            }
        />
    )
}
