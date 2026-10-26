'use client'

// CLUSTER-FIRST QUERY NETWORK
//
// Purpose: a user searches a topic to learn which research COMMUNITIES exist
// around it, who is in each, and who bridges them. Single institutions in a
// graph nobody can click do not answer that — so the list on the left lists
// CLUSTERS (Louvain communities of the capped collaboration network, ranked by
// the shared projects inside them), the graph colours and selects by cluster,
// and the tabs describe the selected cluster: overview, members, projects, and
// the bridges (hinge organisations, bridge projects) that connect clusters.
// The maths lives in ./clusters (pure, deterministic, unit-tested).

import {projectSearchResponseSchema, type ProjectSearchResponse} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import HubIcon from '@mui/icons-material/Hub'
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
    buildSuggestionLink,
    describeUrlParams,
    readText,
    SEARCH_PARAM,
    useUrlCorpus,
    useUrlDetailPage,
    useUrlFilters,
    useUrlLayer,
    useUrlMapView,
    useUrlMaxEdges,
    useUrlPage,
    useUrlSelection,
    useUrlState,
    useUrlYears,
} from '@/common/url'
import {SEARCH_BLOCK_SX} from '../entity/EntityResultsPanel'
import {FacetValuesMenuButton} from '../entity/FacetValuesMenuButton'
import {RelatedList, type RelatedRow} from '../entity/RelatedList'
import {queryNetworkHiddenTabs, visibleTabs} from '../entity/tabAvailability'
import {TopicsFilterButton} from '../entity/TopicsFilterButton'
import {useAvailableTab} from '../entity/useAvailableTab'
import {useRelatedSearch} from '../entity/useRelatedSearch'
import {useTopicNames} from '../entity/useTopicBrowser'
import {NETWORK_COVERAGE_NOTE} from './networkChatContext'
import {pageCountOf, pageOf} from './networkAdapter'
import {BRIDGE_LIST_LIMIT, BridgesTab} from './BridgesTab'
import {ClusterOverviewTab} from './ClusterOverviewTab'
import {ClusterRow, clusterRowSubtitle} from './ClusterRow'
import {clusterArcs, selectedClusterPoints} from './clusterGraph'
import {findCluster} from './clusters'
import {QUERY_NETWORK_LAYERS, QueryNetworkGraphTab} from './QueryNetworkGraphTab'
import {byIdOrder, projectsByIdsPath, queryNetworkFilterQuery, QUERY_LIST_PAGE_SIZE} from './queryNetworkAdapter'
import {queryNetworkLazyContext, queryNetworkStateSection, selectedClusterSection} from './queryNetworkChatContext'
import {useClusterModel} from './useClusterModel'
import {useQueryNetwork} from './useQueryNetwork'

const TAB_LIST = ['graph', 'overview', 'organisations', 'projects', 'bridges'] as const
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

/**
 * `/search/collaboration/queryNetwork`. Holds no state of its own: q, corpus,
 * filters, the cap, the layer, the selected cluster (`sel`), the tab, the list
 * page and the map camera all live in the URL (apps/web/RULES.md #7).
 */
export function QueryNetworkPanel() {
    const router = useRouter()
    const {params, update} = useUrlState()
    const query = readText(params, SEARCH_PARAM.query)
    const {corpus} = useUrlCorpus()
    const {page, setPage} = useUrlPage()
    const {layer, setLayer} = useUrlLayer(QUERY_NETWORK_LAYERS)
    const {initialView, onViewChange} = useUrlMapView()
    const {years, setYears, minYear, maxYear} = useUrlYears()
    const {values: filterValues, setFilter, activeCount} = useUrlFilters(FILTER_PARAMS)
    const {maxEdges, setMaxEdges, min: minEdges, max: maxEdgesCap} = useUrlMaxEdges()
    const topicName = useTopicNames()

    const filterQuery = queryNetworkFilterQuery(params)
    const {data: network, loading, error} = useQueryNetwork(filterQuery, maxEdges)
    const {model, titles} = useClusterModel(network)

    const pageCount = pageCountOf(model.clusters.length, QUERY_LIST_PAGE_SIZE)
    const currentPage = Math.min(page, pageCount)
    const pageClusters = pageOf(model.clusters, currentPage, QUERY_LIST_PAGE_SIZE)

    // `sel` falls back to the strongest cluster; a number that is not a cluster
    // of this network (a stale link, a lowered cap) falls back the same way.
    const {selectedId: requestedId} = useUrlSelection(model.clusters[0]?.id ?? null)
    const selectedCluster = findCluster(model, requestedId) ?? model.clusters[0] ?? null

    // Tabs with nothing to show are not offered (see entity/tabAvailability).
    const hiddenTabs = useMemo(
        () =>
            queryNetworkHiddenTabs(
                selectedCluster ? {clusterProjects: selectedCluster.projects.length, hinges: model.hinges.length, hingeProjects: model.hingeProjects.length} : null,
            ),
        [selectedCluster, model],
    )
    const {tab, setTab, available} = useAvailableTab(TAB_LIST, hiddenTabs)
    const {page: dpage, setPage: setDetailPage} = useUrlDetailPage()

    const topicLabel = useCallback((topicId: string) => topicName('topic', topicId), [topicName])

    // The cluster's projects, one page of ids at a time through the projects
    // search (`only=`), put back in the ranking order the ids are held in.
    const clusterProjectIds = useMemo(() => (selectedCluster ? selectedCluster.projects.map((project) => network.projects.ids[project]) : []), [selectedCluster, network.projects.ids])
    const projectPageIds = pageOf(clusterProjectIds, dpage, QUERY_LIST_PAGE_SIZE)
    const projectsTab = useRelatedSearch({
        key: selectedCluster ? `${selectedCluster.id}|${filterQuery}|${maxEdges}` : null,
        path: (requested) => projectsByIdsPath(pageOf(clusterProjectIds, requested, QUERY_LIST_PAGE_SIZE)),
        schema: projectSearchResponseSchema,
        empty: EMPTY_PROJECTS,
        enabled: tab === 'projects' && selectedCluster !== null && clusterProjectIds.length > 0,
    })
    const placementByProjectId = useMemo(() => new Map(model.placements.map((placement) => [network.projects.ids[placement.project], placement])), [model.placements, network.projects.ids])

    const bridgePlacements = useMemo(() => model.hingeProjects.slice(0, BRIDGE_LIST_LIMIT), [model.hingeProjects])
    const bridgeIds = useMemo(() => bridgePlacements.map((placement) => network.projects.ids[placement.project]), [bridgePlacements, network.projects.ids])
    const bridgesTab = useRelatedSearch({
        key: `bridges|${filterQuery}|${maxEdges}`,
        path: () => projectsByIdsPath(bridgeIds),
        schema: projectSearchResponseSchema,
        empty: EMPTY_PROJECTS,
        enabled: tab === 'bridges' && bridgeIds.length > 0,
    })
    const bridgeHits = useMemo(() => {
        const byId = new Map(bridgesTab.data.hits.map((hit) => [hit.id, hit]))
        return bridgeIds.map((id) => byId.get(id))
    }, [bridgesTab.data.hits, bridgeIds])

    const selectCluster = useCallback((id: string) => update({[SEARCH_PARAM.selection]: id}), [update])
    const openOrganisation = useCallback((id: string) => router.push(buildEntityLink({entity: 'organisations', id, corpus})), [router, corpus])
    const openNetworkOf = useCallback(
        (id: string) => router.push(buildSuggestionLink({route: '/search/collaboration/organisationNetwork', entity: 'organisations', id, corpus, focus: 'center'})),
        [router, corpus],
    )
    const openProject = useCallback((id: string) => router.push(buildEntityLink({entity: 'projects', id, corpus})), [router, corpus])

    const hasActiveFilters = activeCount > 0 || years !== null
    const resetFilters = useCallback(
        () => update(buildResetPatch(params, [SEARCH_PARAM.entity, SEARCH_PARAM.corpus, SEARCH_PARAM.query, SEARCH_PARAM.tab, SEARCH_PARAM.layer, SEARCH_PARAM.view, SEARCH_PARAM.maxEdges])),
        [params, update],
    )

    const labelUrlValue = useCallback(
        (param: string, value: string) => {
            if (param === SEARCH_PARAM.corpus) return CORPUSES.find((option) => option.key === value)?.fullName ?? value
            if (param === SEARCH_PARAM.selection) return findCluster(model, value) ? `cluster ${value}: ${titles.get(value)?.title ?? ''}` : value
            if (param === 'topic' || param === 'subfield' || param === 'field') return topicName(param, value)
            return value
        },
        [model, titles, topicName],
    )

    const pageContext = useMemo(
        () =>
            buildPageContext({
                sections: [
                    queryNetworkStateSection({
                        query,
                        corpusName: CORPUSES.find((option) => option.key === corpus)?.fullName ?? corpus,
                        network,
                        model,
                        titles,
                        maxEdges,
                        layer,
                        urlParams: describeUrlParams(params, {labelValue: labelUrlValue})
                            .map((described) => `${described.label} = ${described.values.join(', ')}`)
                            .join('; '),
                    }),
                    ...(selectedCluster ? [selectedClusterSection({cluster: selectedCluster, network, model, titles, topicLabel})] : []),
                ],
                sources: [],
                lazy: queryNetworkLazyContext({cluster: selectedCluster, network, model, hiddenTabs}),
            }),
        [query, corpus, network, model, titles, maxEdges, layer, params, labelUrlValue, selectedCluster, topicLabel, hiddenTabs],
    )
    usePageChatContextPublisher(pageContext)

    const arcsDrawn = useMemo(() => clusterArcs(network, model).links.length, [network, model])
    // A cluster none of whose organisations has coordinates cannot be shown on the map.
    const selectedUnlocated = selectedCluster !== null && selectedClusterPoints(network, model, selectedCluster.id).length === 0
    const {meta} = network
    const edgeCount = network.edges.length

    const projectRows: RelatedRow[] = byIdOrder(projectsTab.data.hits, projectPageIds).map((project) => {
        const placement = placementByProjectId.get(project.id)
        const bridge = placement?.isBridge ? placement.span.filter((id) => id !== selectedCluster?.id) : []
        return {
            id: project.id,
            primary: project.acronym && project.title ? `${project.acronym} — ${project.title}` : (project.title ?? project.acronym ?? project.id),
            secondary: [
                project.year != null ? String(project.year) : null,
                [...project.funder, ...project.programme].join(' / ') || null,
                bridge.length ? `also spans cluster${bridge.length === 1 ? '' : 's'} ${bridge.join(', ')}` : null,
            ]
                .filter(Boolean)
                .join(' · '),
            badge: bridge.length ? 'Bridge' : undefined,
        }
    })

    const memberRows: RelatedRow[] = selectedCluster
        ? pageOf(selectedCluster.members, dpage, QUERY_LIST_PAGE_SIZE).map((member) => {
              const node = network.nodes[member]
              const lead = selectedCluster.leads.find((entry) => entry.node === member)
              return {
                  id: node.id,
                  primary: node.name,
                  secondary: [node.countryCode, lead ? `${lead.weight.toLocaleString('en-US')} shared projects inside the cluster` : null, selectedCluster.hingeNodes.includes(member) ? 'bridge organisation' : null]
                      .filter(Boolean)
                      .join(' · '),
                  icon: (
                      <Tooltip title="Show this organisation's collaboration network">
                          <IconButton
                              size="small"
                              aria-label={`Show the network of ${node.name}`}
                              onClick={(event) => {
                                  event.stopPropagation()
                                  openNetworkOf(node.id)
                              }}
                          >
                              <HubIcon fontSize="small" />
                          </IconButton>
                      </Tooltip>
                  ),
              }
          })
        : []

    const selectedTitle = selectedCluster ? (titles.get(selectedCluster.id) ?? {title: `Cluster ${selectedCluster.id}`, subtitle: ''}) : null

    return (
        <Box sx={SEARCH_BLOCK_SX}>
            <FacetSidebar>
                <YearFilter value={years} onChange={setYears} min={minYear} max={maxYear} />
                <Box sx={{border: 1, borderColor: 'divider', borderRadius: 3, p: 2}}>
                    <Text variant="overline" color="text.secondary" sx={{fontWeight: 600, display: 'block', mb: 1}}>
                        Collaborations used
                    </Text>
                    <SingleSlider min={minEdges} max={maxEdgesCap} step={10} value={maxEdges} onChange={setMaxEdges} label="Strongest collaborations" playable={false} />
                    <Text variant="caption" color="text.secondary" sx={{display: 'block', mt: 1}}>
                        The cap keeps the collaborations with the most shared projects and, among equals, those in the best-ranked projects. Clusters are found in what is kept.
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
                {model.clusters.length > 0 && <NoticeBar tone="note">Clusters depend on your search and on the edge cap.</NoticeBar>}
                {edgeCount > 0 && meta.capped && (
                    <NoticeBar tone="note">
                        Using the {edgeCount.toLocaleString('en-US')} strongest of {meta.edgesFound.toLocaleString('en-US')} collaborations. Raise the cap on the left to see more.
                    </NoticeBar>
                )}
                {layer === 'arcs' && edgeCount > 0 && arcsDrawn < edgeCount && (
                    <NoticeBar tone="note">
                        {(edgeCount - arcsDrawn).toLocaleString('en-US')} collaborations involve an organisation without a location and are not drawn on the map; the clusters still count them.
                    </NoticeBar>
                )}

                {layer === 'arcs' && selectedCluster && selectedUnlocated && (
                    <NoticeBar tone="note">
                        None of the organisations in cluster {selectedCluster.id} has a location, so the map cannot show it. Switch to the Network layout to see it.
                    </NoticeBar>
                )}

                <Box sx={{flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 3}}>
                    <Box sx={{flex: '1 1 0', minWidth: 0}}>
                        <PaginatedList
                            header={
                                <Text variant="body2" truncate color="text.secondary">
                                    {model.clusters.length.toLocaleString('en-US')} cluster{model.clusters.length === 1 ? '' : 's'} · strongest first
                                </Text>
                            }
                            items={pageClusters}
                            getItemKey={(cluster) => cluster.id}
                            renderItem={(cluster) => {
                                const entry = titles.get(cluster.id)
                                return (
                                    <ClusterRow
                                        cluster={cluster}
                                        title={entry?.title ?? `Cluster ${cluster.id}`}
                                        subtitle={clusterRowSubtitle(cluster, entry?.subtitle ?? '')}
                                        selected={cluster.id === selectedCluster?.id}
                                        onSelect={selectCluster}
                                    />
                                )
                            }}
                            page={currentPage}
                            pageCount={pageCount}
                            onPageChange={setPage}
                        />
                    </Box>

                    <Box sx={{flex: '1 1 0', minWidth: 0}}>
                        <TabbedPanel
                            value={tab}
                            onChange={(next) => setTab(next as (typeof TAB_LIST)[number])}
                            tabs={visibleTabs(
                                [
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
                                                model={model}
                                                titles={titles}
                                                loading={loading}
                                                layer={layer}
                                                onLayerChange={setLayer}
                                                selectedClusterId={selectedCluster?.id ?? null}
                                                onSelectCluster={selectCluster}
                                                initialView={initialView}
                                                onViewChange={onViewChange}
                                            />
                                        ),
                                    },
                                    {
                                        value: 'overview',
                                        label: 'Overview',
                                        content:
                                            selectedCluster && selectedTitle ? (
                                                <ClusterOverviewTab
                                                    cluster={selectedCluster}
                                                    title={selectedTitle.title}
                                                    subtitle={selectedTitle.subtitle}
                                                    network={network}
                                                    model={model}
                                                    titles={titles}
                                                    topicLabel={topicLabel}
                                                    onOpenOrganisation={openOrganisation}
                                                    onSelectCluster={selectCluster}
                                                    onOpenBridges={() => setTab('bridges')}
                                                />
                                            ) : (
                                                <EmptyTabMessage message="No clusters for this search. Try a broader query or fewer filters." />
                                            ),
                                    },
                                    {
                                        value: 'organisations',
                                        label: 'Organisations',
                                        content: selectedCluster ? (
                                            <RelatedList
                                                caption={`${selectedCluster.members.length.toLocaleString('en-US')} organisations in this cluster, most connected first`}
                                                rows={memberRows}
                                                page={dpage}
                                                pageCount={pageCountOf(selectedCluster.members.length, QUERY_LIST_PAGE_SIZE)}
                                                onPageChange={setDetailPage}
                                                loading={false}
                                                emptyMessage="No organisations."
                                                onSelect={openOrganisation}
                                            />
                                        ) : (
                                            <EmptyTabMessage message="Select a cluster to see its organisations." />
                                        ),
                                    },
                                    {
                                        value: 'projects',
                                        label: 'Projects',
                                        content: selectedCluster ? (
                                            <RelatedList
                                                caption={`${clusterProjectIds.length.toLocaleString('en-US')} of the scanned projects belong to this cluster (most of their organisations are members), best-ranked first`}
                                                rows={projectRows}
                                                page={dpage}
                                                pageCount={pageCountOf(clusterProjectIds.length, QUERY_LIST_PAGE_SIZE)}
                                                onPageChange={setDetailPage}
                                                loading={projectsTab.loading}
                                                emptyMessage="No scanned project belongs to this cluster."
                                                onSelect={openProject}
                                            />
                                        ) : (
                                            <EmptyTabMessage message="Select a cluster to see its projects." />
                                        ),
                                    },
                                    {
                                        value: 'bridges',
                                        label: 'Bridges',
                                        content: (
                                            <BridgesTab
                                                network={network}
                                                model={model}
                                                titles={titles}
                                                projects={bridgeHits}
                                                projectPlacements={bridgePlacements}
                                                onOpenOrganisation={openOrganisation}
                                                onOpenProject={openProject}
                                                onSelectCluster={selectCluster}
                                            />
                                        ),
                                    },
                                ],
                                available,
                            )}
                        />
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}
