'use client'

import {
    MINORITY_FACET_FIELDS,
    MINORITY_SORT_OPTIONS,
    minorityDtoSchema,
    minorityFundersResponseSchema,
    minoritySearchResponseSchema,
    minorityTopicsResponseSchema,
    projectSearchResponseSchema,
    workOrganisationsResponseSchema,
    workSearchResponseSchema,
    type MinorityFacetParam,
    type MinorityFundersResponse,
    type MinoritySearchResponse,
    type MinoritySort,
    type MinorityTopicsResponse,
    type ProjectSearchResponse,
    type WorkOrganisationsResponse,
    type WorkSearchResponse,
} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import FormControlLabel from '@mui/material/FormControlLabel'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Switch from '@mui/material/Switch'
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
import {RelatedList, type RelatedRow} from '../entity/RelatedList'
import {ResultsHeader} from '../entity/ResultsHeader'
import {TopicsFilterButton} from '../entity/TopicsFilterButton'
import {useTopicNames} from '../entity/useTopicBrowser'
import {describeSearchState, formatResultCount} from '../entity/searchState'
import {useEntityFacets, labelFacetValue} from '../entity/useEntityFacets'
import {useEntitySearch} from '../entity/useEntitySearch'
import {useRelatedSearch} from '../entity/useRelatedSearch'
import {useSelectedEntity} from '../entity/useSelectedEntity'
import {MinorityOverviewTab} from './MinorityOverviewTab'
import {MinorityResultRow} from './MinorityResultRow'
import {MinoritySubgroupsTab} from './MinoritySubgroupsTab'
import {MINORITY_COUNT_DISCLAIMER, formatCount} from './minorityFormat'
import {
    minorityFundersSection,
    minoritySources,
    minorityTopicsSection,
    selectedMinoritySection,
    summarizeMinorityRow,
} from './minoritiesChatContext'

const EMPTY_RESULTS: MinoritySearchResponse = {
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
const EMPTY_TOPICS: MinorityTopicsResponse = {hits: [], estimatedTotalHits: 0, page: 1, pageCount: 1}
const EMPTY_FUNDERS: MinorityFundersResponse = {hits: [], estimatedTotalHits: 0, page: 1, pageCount: 1}
const EMPTY_ORGANISATIONS: WorkOrganisationsResponse = {hits: [], estimatedTotalHits: 0, page: 1, pageCount: 1}
// Shown until a tab's first response lands. Spelled out per entity rather
// than shared, because each search envelope is typed to its own row.
const EMPTY_PROJECTS: ProjectSearchResponse = {...EMPTY_RESULTS, hits: []}
const EMPTY_WORKS: WorkSearchResponse = {...EMPTY_RESULTS, hits: []}

const SORT_VALUES = MINORITY_SORT_OPTIONS.map((option) => option.value)
const FILTER_PARAMS = MINORITY_FACET_FIELDS.map((facet) => facet.param)
// No `map` tab yet: the deck.gl infrastructure arrives with the funding step,
// and this page's map is the slice right after it. Adding the tab here is
// then one entry in this list plus one component.
const TABS = ['overview', 'subgroups', 'projects', 'works', 'organisations', 'topics', 'funding'] as const

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
 * The minority groups entity. On the same generic layer as every other
 * entity — the state that used to live in this module's own hooks
 * (useMinoritySearch / useSelectedMinority) is now in the URL like everywhere
 * else, and those hooks are gone.
 */
export function MinoritiesResultsPanel() {
    const router = useRouter()
    const {params, update} = useUrlState()
    const query = readText(params, SEARCH_PARAM.query)
    const onlyIds = readList(params, SEARCH_PARAM.only)
    const hasSubgroups = params.get('hasSubgroups') === 'true'
    const {submit} = useUrlQueryDraft()
    const {corpus} = useUrlCorpus()
    const {sort, setSort} = useUrlSort<MinoritySort>(SORT_VALUES)
    const {page, setPage} = useUrlPage()
    const {tab, setTab} = useUrlTab(TABS)
    const {values: filterValues, setFilter, activeCount} = useUrlFilters<MinorityFacetParam>(FILTER_PARAMS)

    const {data, error} = useEntitySearch('minorities', minoritySearchResponseSchema, EMPTY_RESULTS)
    const facets = useEntityFacets(MINORITY_FACET_FIELDS, data.facetDistribution, data.facetLabels)

    const rowIds = useMemo(() => data.hits.map((hit) => hit.qid), [data.hits])
    const {selectedId, detail, loading: detailLoading, select} = useSelectedEntity('minorities', minorityDtoSchema, rowIds)
    const indexedQids = useMemo(() => new Set(rowIds), [rowIds])

    // Every tab is the same request shape keyed to the selected group — see
    // useRelatedSearch. Only the path differs.
    const qid = selectedId
    const projectsTab = useRelatedSearch({
        key: qid,
        path: (dpage) => `/v1/projects/search?minority=${encodeURIComponent(qid ?? '')}&page=${dpage}`,
        schema: projectSearchResponseSchema,
        empty: EMPTY_PROJECTS,
        enabled: tab === 'projects',
    })
    const worksTab = useRelatedSearch({
        key: qid,
        path: (dpage) => `/v1/works/search?minority=${encodeURIComponent(qid ?? '')}&page=${dpage}`,
        schema: workSearchResponseSchema,
        empty: EMPTY_WORKS,
        enabled: tab === 'works',
    })
    const organisationsTab = useRelatedSearch({
        key: qid,
        path: (dpage) => `/v1/minorities/${encodeURIComponent(qid ?? '')}/organisations?page=${dpage}`,
        schema: workOrganisationsResponseSchema,
        empty: EMPTY_ORGANISATIONS,
        enabled: tab === 'organisations',
    })
    const topicsTab = useRelatedSearch({
        key: qid,
        path: (dpage) => `/v1/minorities/${encodeURIComponent(qid ?? '')}/topics?page=${dpage}`,
        schema: minorityTopicsResponseSchema,
        empty: EMPTY_TOPICS,
        enabled: tab === 'topics',
    })
    const fundersTab = useRelatedSearch({
        key: qid,
        path: (dpage) => `/v1/minorities/${encodeURIComponent(qid ?? '')}/funders?page=${dpage}`,
        schema: minorityFundersResponseSchema,
        empty: EMPTY_FUNDERS,
        enabled: tab === 'funding',
    })

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

    // Everything the user narrowed with — query text included — in one patch.
    // The entity and the corpus stay: they are the lens, not a filter.
    const resetFilters = useCallback(
        () => update(buildResetPatch(params, [SEARCH_PARAM.entity, SEARCH_PARAM.corpus])),
        [params, update],
    )

    const filterProps: EntityFiltersProps = {
        entity: 'minorities',
        facets,
        values: filterValues,
        onFilterChange: (param, next) => setFilter(param as MinorityFacetParam, next),
        onReset: resetFilters,
        hasActiveFilters: activeCount > 0 || hasSubgroups,
        sidebarHeader: (
            <Paper variant="outlined" sx={{p: 2}}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={hasSubgroups}
                            onChange={(event) => update({hasSubgroups: event.target.checked ? 'true' : null})}
                        />
                    }
                    label={<Text variant="body2">Has documented subgroups</Text>}
                    sx={{ml: 0}}
                />
            </Paper>
        ),
        facetHeaders: {
            topic: <TopicsFilterButton entity="minorities" countNoun="groups" variant="text" label="Browse all topics" />,
        },
        titleKey: 'minorities',
        filterBarExtra: <TopicsFilterButton entity="minorities" countNoun="groups" />,
    }

    const openProject = useCallback(
        (projectId: string) => router.push(buildEntityLink({entity: 'projects', id: projectId, corpus})),
        [router, corpus],
    )
    const openWork = useCallback(
        (workId: string) => router.push(buildEntityLink({entity: 'works', id: workId, corpus})),
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
                            sortLabel: MINORITY_SORT_OPTIONS.find((option) => option.value === sort)?.label ?? null,
                            page: data.page,
                            pageCount: data.pageCount,
                            count: data,
                            entityNoun: 'minority groups',
                            urlParams: describeUrlParams(params, {labelValue: labelUrlValue}),
                            fuzzy: data.mode === 'fuzzy',
                            didYouMean: data.didYouMean,
                        }),
                        rows: data.hits.map(summarizeMinorityRow),
                    },
                    ...(detail ? [selectedMinoritySection(detail)] : []),
                    ...(detail && tab === 'topics'
                        ? [minorityTopicsSection(detail, topicsTab.data.hits, topicsTab.data.estimatedTotalHits)]
                        : []),
                    ...(detail && tab === 'funding'
                        ? [minorityFundersSection(detail, fundersTab.data.hits, fundersTab.data.estimatedTotalHits)]
                        : []),
                ],
                sources: minoritySources(detail, data.hits),
            }),
        [data, query, corpus, sort, detail, params, labelUrlValue, tab, topicsTab.data, fundersTab.data],
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
                ) : onlyIds.length > 0 ? (
                    <DeepLinkNotice
                        onlyIds={onlyIds}
                        noun="group"
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
                            noun="groups"
                            sortOptions={MINORITY_SORT_OPTIONS}
                            sort={sort}
                            onSortChange={setSort}
                        />
                    }
                    items={data.hits}
                    getItemKey={(item) => item.qid}
                    renderItem={(item) => (
                        <MinorityResultRow minority={item} selected={item.qid === selectedId} onSelect={select} />
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
                                <MinorityOverviewTab minority={detail} />
                            ) : (
                                <EmptyTabMessage message={detailLoading ? 'Loading…' : 'Select a group to see its details.'} />
                            ),
                        },
                        {
                            value: 'subgroups',
                            label: 'Subgroups',
                            content: detail ? (
                                <MinoritySubgroupsTab minority={detail} onSelectSubgroup={select} indexedQids={indexedQids} />
                            ) : (
                                <EmptyTabMessage message="Select a group to see its subgroups." />
                            ),
                        },
                        {
                            value: 'projects',
                            label: 'Projects',
                            content: detail ? (
                                <RelatedList
                                    caption={`${formatResultCount(projectsTab.data)} projects mention this group — ${MINORITY_COUNT_DISCLAIMER}`}
                                    rows={projectRows}
                                    page={projectsTab.page}
                                    pageCount={projectsTab.data.pageCount}
                                    onPageChange={projectsTab.setPage}
                                    loading={projectsTab.loading}
                                    emptyMessage="No projects in the index mention this group."
                                    onSelect={openProject}
                                />
                            ) : (
                                <EmptyTabMessage message="Select a group to see the projects that mention it." />
                            ),
                        },
                        {
                            value: 'works',
                            label: 'Works',
                            content: detail ? (
                                <RelatedList
                                    caption={`${formatResultCount(worksTab.data)} works, tagged via their linked project`}
                                    rows={workRows}
                                    page={worksTab.page}
                                    pageCount={worksTab.data.pageCount}
                                    onPageChange={worksTab.setPage}
                                    loading={worksTab.loading}
                                    emptyMessage="No works in the index are linked to this group."
                                    onSelect={openWork}
                                />
                            ) : (
                                <EmptyTabMessage message="Select a group to see its works." />
                            ),
                        },
                        {
                            value: 'organisations',
                            label: 'Organisations',
                            content: detail ? (
                                <RelatedList
                                    caption={`${organisationsTab.data.estimatedTotalHits} organisations worked on this group's projects, most projects first`}
                                    rows={organisationsTab.data.hits.map((organisation) => ({
                                        id: organisation.id,
                                        primary: organisation.legalName ?? organisation.legalShortName ?? organisation.id,
                                        secondary: [
                                            organisation.countryCode,
                                            organisation.region && organisation.region !== 'Unknown' ? organisation.region : null,
                                            formatCount(organisation.project_count, 'project'),
                                        ]
                                            .filter(Boolean)
                                            .join(' · '),
                                    }))}
                                    page={organisationsTab.page}
                                    pageCount={organisationsTab.data.pageCount}
                                    onPageChange={organisationsTab.setPage}
                                    loading={organisationsTab.loading}
                                    emptyMessage="No organisations recorded for this group's projects."
                                    onSelect={openOrganisation}
                                />
                            ) : (
                                <EmptyTabMessage message="Select a group to see the organisations researching it." />
                            ),
                        },
                        {
                            value: 'topics',
                            label: 'Topics',
                            content: detail ? (
                                <RelatedList
                                    caption={`${topicsTab.data.estimatedTotalHits} research topics across this group's projects`}
                                    rows={topicsTab.data.hits.map((topic) => ({
                                        id: topic.topic_id,
                                        primary: topic.topic_name,
                                        secondary: [topic.subfield_name, topic.field_name, formatCount(topic.project_count, 'project')]
                                            .filter(Boolean)
                                            .join(' · '),
                                    }))}
                                    page={topicsTab.page}
                                    pageCount={topicsTab.data.pageCount}
                                    onPageChange={topicsTab.setPage}
                                    loading={topicsTab.loading}
                                    emptyMessage="No research topics recorded for this group."
                                    onSelect={(topicId) =>
                                        router.push(`/search?e=projects&minority=${encodeURIComponent(detail.qid)}&topic=${encodeURIComponent(topicId)}`)
                                    }
                                />
                            ) : (
                                <EmptyTabMessage message="Select a group to see its research topics." />
                            ),
                        },
                        {
                            value: 'funding',
                            label: 'Funding',
                            content: detail ? (
                                <RelatedList
                                    caption={`${fundersTab.data.estimatedTotalHits} funders behind this group's projects`}
                                    rows={fundersTab.data.hits.map((funder) => ({
                                        id: funder.funder,
                                        primary: funder.funder,
                                        secondary: [funder.programmes.join(', ') || null, formatCount(funder.project_count, 'project')]
                                            .filter(Boolean)
                                            .join(' · '),
                                    }))}
                                    page={fundersTab.page}
                                    pageCount={fundersTab.data.pageCount}
                                    onPageChange={fundersTab.setPage}
                                    loading={fundersTab.loading}
                                    emptyMessage="No funders recorded for this group's projects."
                                    onSelect={(funder) =>
                                        router.push(`/search?e=projects&minority=${encodeURIComponent(detail.qid)}&funder=${encodeURIComponent(funder)}`)
                                    }
                                />
                            ) : (
                                <EmptyTabMessage message="Select a group to see who funded its projects." />
                            ),
                        },
                    ]}
                />
            }
        />
    )
}
