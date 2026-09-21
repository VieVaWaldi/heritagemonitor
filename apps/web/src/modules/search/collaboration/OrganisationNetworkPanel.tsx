'use client'

import {projectSearchResponseSchema, type ProjectSearchResponse} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import {useRouter} from 'next/navigation'
import {useCallback, useMemo} from 'react'
import {CORPUSES} from '@/common/catalog'
import {FacetSidebar, FilterBar, NoticeBar, PaginatedList, TabbedPanel, YearFilter} from '@/common/components'
import {buildPageContext} from '@/common/llmchat/pageContext'
import {usePageChatContextPublisher} from '@/common/llmchat/PageChatContext'
import {Text} from '@/common/text'
import {
    buildEntityLink,
    buildResetPatch,
    describeUrlParams,
    SEARCH_PARAM,
    useUrlCorpus,
    useUrlFilters,
    useUrlMapView,
    useUrlPage,
    useUrlSelection,
    useUrlState,
    useUrlYears,
} from '@/common/url'
import {SEARCH_BLOCK_SX} from '../entity/EntityResultsPanel'
import {FacetValuesMenuButton} from '../entity/FacetValuesMenuButton'
import {RelatedList, type RelatedRow} from '../entity/RelatedList'
import {TopicsFilterButton} from '../entity/TopicsFilterButton'
import {useRelatedRequest} from '../entity/useRelatedRequest'
import {organisationNetworkHiddenTabs, visibleTabs} from '../entity/tabAvailability'
import {useAvailableTab} from '../entity/useAvailableTab'
import {useRelatedSearch} from '../entity/useRelatedSearch'
import {useTopicNames} from '../entity/useTopicBrowser'
import {organisationSources, selectedOrganisationSection} from '../organisations/organisationsChatContext'
import {NetworkDetailTab} from './NetworkDetailTab'
import {NetworkMapTab} from './NetworkMapTab'
import {NETWORK_COVERAGE_NOTE, networkLazyContext, networkStateSection, selectedPairLine} from './networkChatContext'
import {
    centreOf,
    centreProjectsPath,
    findNode,
    networkFilterQuery,
    pageCountOf,
    pageOf,
    sharedProjectsPath,
} from './networkAdapter'
import {PartnerRow} from './PartnerRow'
import {EMPTY_NETWORK, useOrganisationDetail, useOrganisationNetwork} from './useOrganisationNetwork'

const TABS = ['map', 'detail', 'projects'] as const
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
 * `/search/collaboration/organisationNetwork`: who works with whom, centred on
 * one organisation.
 *
 * Left, the list of collaborations — the centre first, then its partners by
 * shared projects. Right, the tabbed panel: the map (default; arcs from the
 * centre to every partner), the selected organisation with the projects that
 * link it to the centre, and the centre's own projects.
 *
 * Holds no state of its own: the centre (`center`), the selected partner
 * (`sel`), the tab, the list page, the filters and the map camera all live in
 * the URL (apps/web/RULES.md #7), so a copied link restores the page and back
 * undoes a click.
 */
export function OrganisationNetworkPanel() {
    const router = useRouter()
    const {params, update} = useUrlState()
    const {corpus} = useUrlCorpus()
    const {page, setPage} = useUrlPage()
    const {initialView, onViewChange} = useUrlMapView()
    const {years, setYears, minYear, maxYear} = useUrlYears()
    const {values: filterValues, setFilter, activeCount} = useUrlFilters(FILTER_PARAMS)
    const topicName = useTopicNames()

    const centreId = params.get(SEARCH_PARAM.center) || null
    const filterQuery = networkFilterQuery(params)

    const {data: network, loading, error} = useOrganisationNetwork(centreId, filterQuery)
    const centre = centreOf(network)

    // The list is the drawn organisations, the centre first. Paged in the
    // browser: the payload already holds all of them (up to 500).
    const pageCount = pageCountOf(network.nodes.length)
    const currentPage = Math.min(page, pageCount)
    const pageNodes = pageOf(network.nodes, currentPage)

    // `sel` falls back to the centre: a link with only `center` opens the
    // centre's own overview. An id that is not in this network (a stale link,
    // a filter that dropped it) falls back the same way.
    const {selectedId: requestedId} = useUrlSelection(centreId)
    const selectedNode = findNode(network, requestedId) ?? centre
    const detail = useOrganisationDetail(selectedNode?.id ?? null)
    // The centre's own record decides whether its Projects tab exists (see
    // entity/tabAvailability). When the centre IS the selection it is the same
    // record, so it is not fetched twice.
    const selectedIsCentre = selectedNode !== null && selectedNode.id === centre?.id
    const otherCentreDetail = useOrganisationDetail(selectedIsCentre ? null : (centre?.id ?? null))
    const hiddenTabs = useMemo(() => organisationNetworkHiddenTabs(selectedIsCentre ? detail : otherCentreDetail), [selectedIsCentre, detail, otherCentreDetail])
    const {tab, setTab, available} = useAvailableTab(TABS, hiddenTabs)
    const pairSelected = centre !== null && selectedNode !== null && selectedNode.id !== centre.id

    const related = useRelatedRequest('collaboration:projects')
    const sharedTab = useRelatedSearch({
        key: pairSelected ? `${centre.id}|${selectedNode.id}|${filterQuery}` : null,
        path: (dpage) => sharedProjectsPath(centre!.id, selectedNode!.ids, dpage, filterQuery),
        schema: projectSearchResponseSchema,
        empty: EMPTY_PROJECTS,
        enabled: tab === 'detail' && pairSelected,
    })
    const centreProjectsTab = useRelatedSearch({
        key: centre ? `${centre.id}|${filterQuery}` : null,
        path: (dpage) => centreProjectsPath(centre!.id, dpage, filterQuery),
        schema: projectSearchResponseSchema,
        empty: EMPTY_PROJECTS,
        enabled: tab === 'projects',
    })

    // A row or an arc SELECTS a partner: it is drawn on top and its pair opens
    // in the detail tab (from the map; from the list the tab stays put). An
    // icon, the hub button and the detail's button make it the new CENTRE.
    const selectPartner = useCallback((id: string) => update({[SEARCH_PARAM.selection]: id}), [update])
    const selectPartnerFromMap = useCallback(
        (id: string) => update({[SEARCH_PARAM.selection]: id, [SEARCH_PARAM.tab]: 'detail'}),
        [update],
    )
    // `view` goes with the old centre: the map flies to the new one instead of
    // keeping a camera that was framing somebody else.
    const centreOn = useCallback(
        (id: string) => update({[SEARCH_PARAM.center]: id, [SEARCH_PARAM.selection]: null, [SEARCH_PARAM.view]: null}),
        [update],
    )
    const openProject = useCallback(
        (projectId: string) => router.push(buildEntityLink({entity: 'projects', id: projectId, corpus})),
        [router, corpus],
    )

    const hasActiveFilters = activeCount > 0 || years !== null
    const resetFilters = useCallback(
        () =>
            update(
                buildResetPatch(params, [
                    SEARCH_PARAM.entity,
                    SEARCH_PARAM.corpus,
                    SEARCH_PARAM.center,
                    SEARCH_PARAM.selection,
                    SEARCH_PARAM.tab,
                    SEARCH_PARAM.view,
                ]),
            ),
        [params, update],
    )

    const labelUrlValue = useCallback(
        (param: string, value: string) => {
            if (param === SEARCH_PARAM.corpus) return CORPUSES.find((option) => option.key === value)?.fullName ?? value
            if (param === SEARCH_PARAM.center || param === SEARCH_PARAM.selection) return findNode(network, value)?.name ?? value
            if (param === 'topic' || param === 'subfield' || param === 'field') return topicName(param, value)
            return value
        },
        [network, topicName],
    )

    const pageContext = useMemo(
        () =>
            buildPageContext({
                sections: centre
                    ? [
                          networkStateSection({
                              centre,
                              network,
                              corpusName: CORPUSES.find((option) => option.key === corpus)?.fullName ?? corpus,
                              urlParams: describeUrlParams(params, {labelValue: labelUrlValue})
                                  .map((described) => `${described.label} = ${described.values.join(', ')}`)
                                  .join('; '),
                          }),
                          ...(pairSelected ? [{heading: selectedPairLine(centre, selectedNode), rows: []}] : []),
                          ...(detail ? [selectedOrganisationSection(detail)] : []),
                      ]
                    : [
                          {
                              heading:
                                  'The organisation network page is open with no organisation chosen. The visitor picks one with the search bar (organisation suggestions), which centres the network on it.',
                              rows: [],
                          },
                      ],
                sources: detail ? organisationSources(detail, []) : [],
                lazy: centre ? networkLazyContext({centre, partner: selectedNode, filterQuery, hiddenTabs}) : undefined,
            }),
        [centre, network, corpus, params, labelUrlValue, pairSelected, selectedNode, detail, filterQuery, hiddenTabs],
    )
    usePageChatContextPublisher(pageContext)

    const scope = centreId ? `orgAll=${encodeURIComponent(centreId)}` : undefined
    const loadingTable = !network.meta.complete
    const noLocation = network.meta.withoutGeo

    return (
        <Box sx={SEARCH_BLOCK_SX}>
            <FacetSidebar>
                <YearFilter value={years} onChange={setYears} min={minYear} max={maxYear} />
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
                            scope={scope}
                            prefetch={centreId !== null}
                        />
                    ))}
                    <TopicsFilterButton entity="projects" countNoun="projects" />
                </FilterBar>

                {error && <NoticeBar tone="warning">{error}</NoticeBar>}
                {loadingTable && (
                    <NoticeBar tone="note">The organisation table on the server is still loading — the network will appear in a moment.</NoticeBar>
                )}
                {centre && centre.lat === null && (
                    <NoticeBar tone="note">
                        {centre.name} has no location, so no arcs can be drawn from it. Its partners are still listed.
                    </NoticeBar>
                )}
                {centre && noLocation > 0 && (
                    <NoticeBar tone="note">
                        {noLocation.toLocaleString('en-US')} partner{noLocation === 1 ? ' has' : 's have'} no location and {noLocation === 1 ? 'is' : 'are'} not drawn or listed.
                    </NoticeBar>
                )}
                {centre && network.meta.capped && (
                    <NoticeBar tone="note">Showing the strongest {network.meta.partners.toLocaleString('en-US')} partners; there are more.</NoticeBar>
                )}

                <Box sx={{flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 3}}>
                    <Box sx={{flex: '1 1 0', minWidth: 0}}>
                        <PaginatedList
                            header={
                                <Text variant="body2" truncate color="text.secondary">
                                    {centre
                                        ? `${network.meta.partners.toLocaleString('en-US')} collaborations${noLocation > 0 ? ` · ${noLocation.toLocaleString('en-US')} without location` : ''}`
                                        : 'Collaborations'}
                                </Text>
                            }
                            items={pageNodes}
                            getItemKey={(node) => node.id}
                            renderItem={(node) => (
                                <PartnerRow
                                    node={node}
                                    isCentre={node.id === centre?.id}
                                    selected={node.id === selectedNode?.id}
                                    onSelect={selectPartner}
                                    onCentre={centreOn}
                                />
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
                            tabs={visibleTabs([
                                {
                                    value: 'map',
                                    label: 'Map',
                                    // fill + keepMounted: the map owns a WebGL
                                    // context and its own camera; unmounting it
                                    // on a tab switch would reset the view.
                                    fill: true,
                                    keepMounted: true,
                                    content: (
                                        <NetworkMapTab
                                            network={centreId ? network : EMPTY_NETWORK}
                                            loading={loading}
                                            selectedId={selectedNode?.id ?? null}
                                            onSelectPartner={selectPartnerFromMap}
                                            onCentre={centreOn}
                                            initialView={initialView}
                                            onViewChange={onViewChange}
                                        />
                                    ),
                                },
                                {
                                    value: 'detail',
                                    label: 'Overview',
                                    content:
                                        centre && selectedNode ? (
                                            <NetworkDetailTab
                                                node={selectedNode}
                                                centre={centre}
                                                detail={detail}
                                                shared={sharedTab.data}
                                                sharedPage={sharedTab.page}
                                                onSharedPageChange={sharedTab.setPage}
                                                sharedLoading={sharedTab.loading}
                                                filterCaption={related.caption}
                                                onCentre={centreOn}
                                                onSelectProject={openProject}
                                            />
                                        ) : (
                                            <EmptyTabMessage message="Pick an organisation in the search bar to see its collaborations." />
                                        ),
                                },
                                {
                                    value: 'projects',
                                    label: 'Projects',
                                    content: centre ? (
                                        <RelatedList
                                            caption={`${centreProjectsTab.data.estimatedTotalHits.toLocaleString('en-US')} projects of ${centre.name}`}
                                            filterCaption={related.caption}
                                            rows={centreProjectsTab.data.hits.map(projectRow)}
                                            page={centreProjectsTab.page}
                                            pageCount={centreProjectsTab.data.pageCount}
                                            onPageChange={centreProjectsTab.setPage}
                                            loading={centreProjectsTab.loading}
                                            emptyMessage="No projects of this organisation match the filters."
                                            onSelect={openProject}
                                        />
                                    ) : (
                                        <EmptyTabMessage message="Pick an organisation in the search bar to see its projects." />
                                    ),
                                },
                            ], available)}
                        />
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}
