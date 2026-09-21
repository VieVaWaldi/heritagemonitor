'use client'

import {projectSearchResponseSchema, type ProjectSearchResponse} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import {useRouter} from 'next/navigation'
import {useCallback, useMemo} from 'react'
import {CORPUSES} from '@/common/catalog'
import {FacetSidebar, FilterBar, NoticeBar, PaginatedList, SingleSlider, TabbedPanel, YearFilter} from '@/common/components'
import {buildPageContext} from '@/common/llmchat/pageContext'
import {usePageChatContextPublisher} from '@/common/llmchat/PageChatContext'
import {Text} from '@/common/text'
import {
    buildEntityLink,
    buildResetPatch,
    describeUrlParams,
    readText,
    SEARCH_PARAM,
    useUrlCorpus,
    useUrlFilters,
    useUrlLayer,
    useUrlMapView,
    useUrlMaxEdges,
    useUrlPage,
    useUrlSelection,
    useUrlState,
    useUrlTab,
    useUrlYears,
} from '@/common/url'
import {SEARCH_BLOCK_SX} from '../entity/EntityResultsPanel'
import {FacetValuesMenuButton} from '../entity/FacetValuesMenuButton'
import {RelatedList, type RelatedRow} from '../entity/RelatedList'
import {TopicsFilterButton} from '../entity/TopicsFilterButton'
import {useRelatedRequest} from '../entity/useRelatedRequest'
import {useRelatedSearch} from '../entity/useRelatedSearch'
import {useTopicNames} from '../entity/useTopicBrowser'
import {selectedOrganisationSection} from '../organisations/organisationsChatContext'
import {NETWORK_COVERAGE_NOTE} from './networkChatContext'
import {pageCountOf, pageOf} from './networkAdapter'
import {QueryEdgeDetailTab} from './QueryEdgeDetailTab'
import {QueryEdgeRow} from './QueryEdgeRow'
import {QUERY_NETWORK_LAYERS, QueryNetworkGraphTab} from './QueryNetworkGraphTab'
import {edgeArcLinks, edgeProjectsPath, findEdge, matchingProjectsPath, queryEdges, queryNetworkFilterQuery, QUERY_LIST_PAGE_SIZE} from './queryNetworkAdapter'
import {queryNetworkLazyContext, queryNetworkStateSection} from './queryNetworkChatContext'
import {useOrganisationDetail} from './useOrganisationNetwork'
import {useQueryNetwork} from './useQueryNetwork'

const TABS = ['graph', 'detail', 'projects'] as const
const FILTER_PARAMS = [
    SEARCH_PARAM.funder,
    SEARCH_PARAM.programme,
    SEARCH_PARAM.topic,
    SEARCH_PARAM.subfield,
    SEARCH_PARAM.field,
] as const

const EMPTY_PROJECTS: ProjectSearchResponse = {
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

function EmptyTabMessage({message}: {message: string}) {
    return (
        <Box sx={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2.5}}>
            <Text variant="body2" color="text.secondary" sx={{textAlign: 'center'}}>
                {message}
            </Text>
        </Box>
    )
}

function projectRow(project: ProjectSearchResponse['hits'][number]): RelatedRow {
    return {
        id: project.id,
        primary: project.acronym && project.title ? `${project.acronym} — ${project.title}` : (project.title ?? project.acronym ?? project.id),
        secondary: [project.year != null ? String(project.year) : null, [...project.funder, ...project.programme].join(' / ') || null]
            .filter(Boolean)
            .join(' · '),
    }
}

/**
 * `/search/collaboration/queryNetwork`: who collaborates within the projects a
 * text search matches.
 *
 * Left, the collaborations ranked by shared projects. Right, the tabbed panel:
 * the graph (a force layout, or arcs on a map), the selected collaboration
 * with the projects that link its two organisations, and the matching
 * projects. The network is counted over the top of the ranking, capped at the
 * strongest `maxEdges` — the page says so instead of implying a complete map.
 *
 * Holds no state of its own: q, corpus, filters, the cap, the layer, the
 * selected collaboration (`sel` = `<orgA>:<orgB>`), the tab, the list page and
 * the map camera all live in the URL (apps/web/RULES.md #7).
 */
export function QueryNetworkPanel() {
    const router = useRouter()
    const {params, update} = useUrlState()
    const query = readText(params, SEARCH_PARAM.query)
    const {corpus} = useUrlCorpus()
    const {page, setPage} = useUrlPage()
    const {tab, setTab} = useUrlTab(TABS)
    const {layer, setLayer} = useUrlLayer(QUERY_NETWORK_LAYERS)
    const {initialView, onViewChange} = useUrlMapView()
    const {years, setYears, minYear, maxYear} = useUrlYears()
    const {values: filterValues, setFilter, activeCount} = useUrlFilters(FILTER_PARAMS)
    const {maxEdges, setMaxEdges, min: minEdges, max: maxEdgesCap} = useUrlMaxEdges()
    const topicName = useTopicNames()

    const filterQuery = queryNetworkFilterQuery(params)
    const {data: network, loading, error} = useQueryNetwork(filterQuery, maxEdges)
    const edges = useMemo(() => queryEdges(network), [network])

    const pageCount = pageCountOf(edges.length, QUERY_LIST_PAGE_SIZE)
    const currentPage = Math.min(page, pageCount)
    const pageEdges = pageOf(edges, currentPage, QUERY_LIST_PAGE_SIZE)

    // `sel` falls back to the strongest collaboration; an id that is not in
    // this network (a stale link, a lowered cap) falls back the same way.
    const {selectedId: requestedId} = useUrlSelection(edges[0]?.id ?? null)
    const selectedEdge = findEdge(edges, requestedId) ?? edges[0] ?? null

    const related = useRelatedRequest('collaboration:queryNetwork')
    const detailA = useOrganisationDetail(selectedEdge?.a.id ?? null)
    const detailB = useOrganisationDetail(selectedEdge?.b.id ?? null)
    const sharedTab = useRelatedSearch({
        key: selectedEdge ? `${selectedEdge.id}|${filterQuery}` : null,
        path: (dpage) => edgeProjectsPath(selectedEdge!, dpage, filterQuery),
        schema: projectSearchResponseSchema,
        empty: EMPTY_PROJECTS,
        enabled: tab === 'detail' && selectedEdge !== null,
    })
    const matchingTab = useRelatedSearch({
        key: filterQuery,
        path: (dpage) => matchingProjectsPath(filterQuery, dpage),
        schema: projectSearchResponseSchema,
        empty: EMPTY_PROJECTS,
        enabled: tab === 'projects',
    })

    // A row selects the collaboration; from the graph it also opens its detail.
    const selectEdge = useCallback((id: string) => update({[SEARCH_PARAM.selection]: id}), [update])
    const selectEdgeFromGraph = useCallback((id: string) => update({[SEARCH_PARAM.selection]: id, [SEARCH_PARAM.tab]: 'detail'}), [update])
    const openProject = useCallback(
        (projectId: string) => router.push(buildEntityLink({entity: 'projects', id: projectId, corpus})),
        [router, corpus],
    )

    const hasActiveFilters = activeCount > 0 || years !== null
    const resetFilters = useCallback(
        () => update(buildResetPatch(params, [SEARCH_PARAM.entity, SEARCH_PARAM.corpus, SEARCH_PARAM.query, SEARCH_PARAM.tab, SEARCH_PARAM.layer, SEARCH_PARAM.view, SEARCH_PARAM.maxEdges])),
        [params, update],
    )

    const labelUrlValue = useCallback(
        (param: string, value: string) => {
            if (param === SEARCH_PARAM.corpus) return CORPUSES.find((option) => option.key === value)?.fullName ?? value
            if (param === SEARCH_PARAM.selection) {
                const edge = findEdge(edges, value)
                return edge ? `${edge.a.name} <-> ${edge.b.name}` : value
            }
            if (param === 'topic' || param === 'subfield' || param === 'field') return topicName(param, value)
            return value
        },
        [edges, topicName],
    )

    const pageContext = useMemo(
        () =>
            buildPageContext({
                sections: [
                    queryNetworkStateSection({
                        query,
                        corpusName: CORPUSES.find((option) => option.key === corpus)?.fullName ?? corpus,
                        network,
                        edges,
                        maxEdges,
                        layer,
                        urlParams: describeUrlParams(params, {labelValue: labelUrlValue})
                            .map((described) => `${described.label} = ${described.values.join(', ')}`)
                            .join('; '),
                    }),
                    ...(selectedEdge
                        ? [
                              {heading: `Selected collaboration: ${selectedEdge.a.name} <-> ${selectedEdge.b.name}, ${selectedEdge.w} shared projects among the scanned ones.`, rows: []},
                              ...(detailA ? [selectedOrganisationSection(detailA)] : []),
                              ...(detailB ? [selectedOrganisationSection(detailB)] : []),
                          ]
                        : []),
                ],
                sources: [],
                lazy: queryNetworkLazyContext({edge: selectedEdge, filterQuery}),
            }),
        [query, corpus, network, edges, maxEdges, layer, params, labelUrlValue, selectedEdge, detailA, detailB, filterQuery],
    )
    usePageChatContextPublisher(pageContext)

    const arcsDrawn = useMemo(() => edgeArcLinks(edges).length, [edges])
    const {meta} = network

    return (
        <Box sx={SEARCH_BLOCK_SX}>
            <FacetSidebar>
                <YearFilter value={years} onChange={setYears} min={minYear} max={maxYear} />
                <Box sx={{border: 1, borderColor: 'divider', borderRadius: 3, p: 2}}>
                    <Text variant="overline" color="text.secondary" sx={{fontWeight: 600, display: 'block', mb: 1}}>
                        Collaborations shown
                    </Text>
                    <SingleSlider min={minEdges} max={maxEdgesCap} step={10} value={maxEdges} onChange={setMaxEdges} label="Strongest collaborations" playable={false} />
                    <Text variant="caption" color="text.secondary" sx={{display: 'block', mt: 1}}>
                        The cap keeps the collaborations with the most shared projects and, among equals, those in the best-ranked projects.
                    </Text>
                </Box>
                <Box sx={{border: 1, borderColor: 'divider', borderRadius: 3, p: 2}}>
                    <Text variant="caption" color="text.secondary" sx={{display: 'block'}}>
                        {NETWORK_COVERAGE_NOTE}
                    </Text>
                </Box>
            </FacetSidebar>

            <Box sx={{flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2}}>
                <FilterBar>
                    <Tooltip title="Reset all filters">
                        <span>
                            <IconButton size="small" onClick={resetFilters} disabled={!hasActiveFilters} aria-label="Reset all filters">
                                <RestartAltIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    {(['funder', 'programme'] as const).map((facet) => (
                        <FacetValuesMenuButton
                            key={facet}
                            entity="projects"
                            facet={facet}
                            label={facet === 'funder' ? 'Funder' : 'Programme'}
                            value={filterValues[facet]}
                            onChange={(next) => setFilter(facet, next)}
                            fallbackOptions={[]}
                            prefetch
                        />
                    ))}
                    <TopicsFilterButton entity="projects" countNoun="projects" />
                </FilterBar>

                {error && <NoticeBar tone="warning">{error}</NoticeBar>}
                {!meta.complete && (
                    <NoticeBar tone="note">The organisation table on the server is still loading — the network will appear in a moment.</NoticeBar>
                )}
                {meta.mode === 'fuzzy' && (
                    <NoticeBar tone="note">
                        Few results for <strong>{query}</strong>, showing close matches instead.
                    </NoticeBar>
                )}
                {edges.length > 0 && meta.capped && (
                    <NoticeBar tone="note">
                        Showing the {edges.length.toLocaleString('en-US')} strongest of {meta.edgesFound.toLocaleString('en-US')} collaborations. Raise the cap on the left to see more.
                    </NoticeBar>
                )}
                {layer === 'arcs' && edges.length > 0 && arcsDrawn < edges.length && (
                    <NoticeBar tone="note">
                        {(edges.length - arcsDrawn).toLocaleString('en-US')} collaborations involve an organisation without a location and are not drawn on the map; they are in the list and the network layout.
                    </NoticeBar>
                )}

                <Box sx={{flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 3}}>
                    <Box sx={{flex: '1 1 0', minWidth: 0}}>
                        <PaginatedList
                            header={
                                <Text variant="body2" truncate color="text.secondary">
                                    {edges.length.toLocaleString('en-US')} collaborations{meta.capped ? ` of ${meta.edgesFound.toLocaleString('en-US')}` : ''} · strongest first
                                </Text>
                            }
                            items={pageEdges}
                            getItemKey={(edge) => edge.id}
                            renderItem={(edge, index) => (
                                <QueryEdgeRow edge={edge} rank={(currentPage - 1) * QUERY_LIST_PAGE_SIZE + index + 1} selected={edge.id === selectedEdge?.id} onSelect={selectEdge} />
                            )}
                            page={currentPage}
                            pageCount={pageCount}
                            onPageChange={setPage}
                        />
                    </Box>

                    <Box sx={{flex: '1 1 0', minWidth: 0}}>
                        <TabbedPanel
                            value={tab}
                            onChange={(next) => setTab(next as (typeof TABS)[number])}
                            tabs={[
                                {
                                    value: 'graph',
                                    label: 'Graph',
                                    // fill + keepMounted: the canvas owns a WebGL
                                    // context and its own camera; unmounting it
                                    // on a tab switch would reset the view.
                                    fill: true,
                                    keepMounted: true,
                                    content: (
                                        <QueryNetworkGraphTab
                                            network={network}
                                            edges={edges}
                                            loading={loading}
                                            layer={layer}
                                            onLayerChange={setLayer}
                                            selectedEdgeId={selectedEdge?.id ?? null}
                                            onSelectEdge={selectEdgeFromGraph}
                                            initialView={initialView}
                                            onViewChange={onViewChange}
                                        />
                                    ),
                                },
                                {
                                    value: 'detail',
                                    label: 'Overview',
                                    content: selectedEdge ? (
                                        <QueryEdgeDetailTab
                                            edge={selectedEdge}
                                            detailA={detailA}
                                            detailB={detailB}
                                            shared={sharedTab.data}
                                            page={sharedTab.page}
                                            onPageChange={sharedTab.setPage}
                                            loading={sharedTab.loading}
                                            filterCaption={related.caption}
                                            onSelectProject={openProject}
                                        />
                                    ) : (
                                        <EmptyTabMessage message="Select a collaboration from the list or click an edge in the graph." />
                                    ),
                                },
                                {
                                    value: 'projects',
                                    label: 'Projects',
                                    content: (
                                        <RelatedList
                                            caption={`${matchingTab.data.estimatedTotalHits.toLocaleString('en-US')}${matchingTab.data.totalCapped ? '+' : ''} matching projects`}
                                            filterCaption={related.caption}
                                            rows={matchingTab.data.hits.map(projectRow)}
                                            page={matchingTab.page}
                                            pageCount={matchingTab.data.pageCount}
                                            onPageChange={matchingTab.setPage}
                                            loading={matchingTab.loading}
                                            emptyMessage="No projects match this search."
                                            onSelect={openProject}
                                        />
                                    ),
                                },
                            ]}
                        />
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}
