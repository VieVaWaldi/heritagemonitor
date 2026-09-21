'use client'

import {organisationDetailSchema, type GrantRow} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import {useRouter} from 'next/navigation'
import {useCallback, useMemo} from 'react'
import {CORPUSES} from '@/common/catalog'
import {NoticeBar, PaginatedList, TabbedPanel} from '@/common/components'
import {buildPageContext} from '@/common/llmchat/pageContext'
import {usePageChatContextPublisher} from '@/common/llmchat/PageChatContext'
import {Text} from '@/common/text'
import {
    buildEntityLink,
    describeUrlParams,
    readList,
    readOptionalOneOf,
    readText,
    SEARCH_PARAM,
    useUrlCorpus,
    useUrlDetailPage,
    useUrlMapView,
    useUrlPage,
    useUrlState,
    useUrlTab,
} from '@/common/url'
import {useSelectedEntity} from '../entity/useSelectedEntity'
import {FundingMapTab} from './FundingMapTab'
import {FundingOrganisationRow} from './FundingOrganisationRow'
import {FundingOrganisationTab} from './FundingOrganisationTab'
import {FundingProgrammesTab, type FundingGrantSort} from './FundingProgrammesTab'
import {fundingSources, selectedFundingOrganisationSection, summariseFundingRow} from './fundingChatContext'
import {FUNDING_AMOUNT_CAVEAT, formatCompactEur, formatGeolocatedShare} from './fundingFormat'
import {useFundingMap, useFundingOrganisations} from './useFundingData'
import {useFundingOrganisationProjects} from './useFundingOrganisationProjects'

const TABS = ['map', 'organisation', 'programmes'] as const

// NOTE: `SEARCH_PARAM.layer` is registered and labelled in common/url but is
// deliberately NOT read here. This page draws hexagons and nothing else — at
// up to 500 mostly European points, individual columns overlap into an
// unreadable thicket, while a hex bin answers the question the page asks. A
// param that switched between one option would be decoration; it gets read
// the moment a second visualization exists.
const GRANT_SORTS = ['dchProjects', 'funding'] as const
const PAGE_SIZE = 20

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
 * `/search/funding`: where the money went.
 *
 * The ranking on the left and the map on the right are two views of ONE
 * aggregation over the projects the filters match (see the api's funding
 * module) — so the page makes two requests that share the same filters rather
 * than one payload, because a page turn and a map redraw happen at different
 * times.
 *
 * Holds no state of its own: query, corpus, filters, page, selected
 * organisation, tab, the detail panel's page and the map camera all live in
 * the URL (apps/web/RULES.md #7).
 */
export function FundingResultsPanel() {
    const router = useRouter()
    const {params, update} = useUrlState()
    const query = readText(params, SEARCH_PARAM.query)
    const {corpus} = useUrlCorpus()
    const {page, setPage} = useUrlPage()
    const {tab, setTab} = useUrlTab(TABS)
    const {initialView, onViewChange} = useUrlMapView()

    const {data, error} = useFundingOrganisations()
    const {data: mapData, loading: mapLoading} = useFundingMap()

    const rowIds = useMemo(() => data.hits.map((hit) => hit.id), [data.hits])
    // One hook for both: it derives the selection from `sel` (falling back to
    // the first row) AND fetches the organisation's full record, which is
    // needed only for Lucy's fetchable sources — everything shown on screen is
    // already on the ranked row.
    const {selectedId, detail, select} = useSelectedEntity('organisations', organisationDetailSchema, rowIds)
    const selectedOrganisation = data.hits.find((hit) => hit.id === selectedId) ?? null

    const organisationTabOpen = tab === 'organisation'
    const {projects, page: projectsPage, setPage: setProjectsPage, loading: projectsLoading} = useFundingOrganisationProjects(
        selectedId,
        organisationTabOpen,
    )

    // `dpage` is the detail panel's own page — shared by the two lists that
    // live in it (this tab's and the organisation tab's). They are never open
    // at once, and it is cleared on a tab change (see patchClearsDetailPage).
    const {page: grantsPage, setPage: setGrantsPage} = useUrlDetailPage()

    const grantParams = {
        corpus,
        funder: readList(params, SEARCH_PARAM.funder),
        programme: readList(params, SEARCH_PARAM.programme),
        jurisdiction: readList(params, SEARCH_PARAM.jurisdiction),
        sort: (readOptionalOneOf(params, SEARCH_PARAM.sort, GRANT_SORTS) ?? 'dchProjects') as FundingGrantSort,
        page: grantsPage,
    }
    const selectedStream = readList(params, SEARCH_PARAM.stream)[0] ?? null

    /**
     * Picking a grant narrows the whole page. `stream` is the precise filter
     * (it matches a project's `funding_stream_ids` exactly); funder and
     * programme are written alongside it because they are the same values on
     * the projects index — redundant as a filter, but they make the active
     * selection readable and let the user widen from a call to its programme
     * by clearing one chip.
     */
    const selectGrant = useCallback(
        (grant: GrantRow) =>
            update({
                [SEARCH_PARAM.stream]: grant.id,
                [SEARCH_PARAM.funder]: grant.funder ? [grant.funder] : null,
                [SEARCH_PARAM.programme]: grant.programme ? [grant.programme] : null,
            }),
        [update],
    )

    // Clears only the picked stream, keeping its funder and programme: the
    // natural next step after looking at one call is its whole programme, not
    // an empty page. "Reset" on the filter chips is what clears everything.
    const clearStream = useCallback(() => update({[SEARCH_PARAM.stream]: null}), [update])

    const openProject = useCallback(
        (projectId: string) => router.push(buildEntityLink({entity: 'projects', id: projectId, corpus})),
        [router, corpus],
    )

    const pageContext = useMemo(
        () =>
            buildPageContext({
                sections: [
                    {
                        heading: [
                            `The funding page ranks organisations by the money that reached them across the matching projects${query ? ` for "${query}"` : ''}.`,
                            `Corpus: ${CORPUSES.find((option) => option.key === corpus)?.fullName ?? corpus}.`,
                            `${data.estimatedTotalHits} organisations ranked${data.capped ? ' (capped at the best-funded 500)' : ''}, page ${data.page} of ${data.pageCount}.`,
                            formatGeolocatedShare(data.geolocated, data.estimatedTotalHits),
                            FUNDING_AMOUNT_CAVEAT,
                            `Active URL parameters: ${describeUrlParams(params)
                                .map((described) => `${described.label} = ${described.values.join(', ')}`)
                                .join('; ')}.`,
                        ].join(' '),
                        rows: data.hits.map(summariseFundingRow),
                    },
                    ...(selectedOrganisation ? [selectedFundingOrganisationSection(selectedOrganisation, projects.hits)] : []),
                ],
                sources: fundingSources(detail),
            }),
        [data, query, corpus, params, selectedOrganisation, projects.hits, detail],
    )
    usePageChatContextPublisher(pageContext)

    return (
        <Box sx={{width: '80%', mx: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 2}}>
            {error && <NoticeBar tone="warning">{error}</NoticeBar>}
            {!data.complete && (
                <NoticeBar tone="note">
                    The organisation table on the server is still loading — the ranking will appear in a moment.
                </NoticeBar>
            )}

            <Box sx={{flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 3}}>
                <Box sx={{flex: '1 1 0', minWidth: 0}}>
                    <PaginatedList
                        // One line: PaginatedList's header is a fixed 48px
                        // strip so it lines up with the tab bar beside it. The
                        // caveat is too long to sit there, so it rides as a
                        // tooltip on the word that needs it — and in full on
                        // the Organisation tab and in Lucy's context.
                        header={
                            <Tooltip title={FUNDING_AMOUNT_CAVEAT}>
                                <Box component="span" sx={{minWidth: 0}}>
                                    <Text variant="body2" truncate color="text.secondary">
                                        {data.estimatedTotalHits.toLocaleString('en-US')} organisations
                                        {data.capped ? ' (best-funded 500)' : ''} · {formatCompactEur(data.totalFundingEur)} total,
                                        approx.
                                    </Text>
                                </Box>
                            </Tooltip>
                        }
                        items={data.hits}
                        getItemKey={(item) => item.id}
                        renderItem={(item, index) => (
                            <FundingOrganisationRow
                                organisation={item}
                                rank={(data.page - 1) * PAGE_SIZE + index + 1}
                                selected={item.id === selectedId}
                                onSelect={select}
                            />
                        )}
                        page={page}
                        pageCount={data.pageCount}
                        onPageChange={setPage}
                    />
                </Box>

                <Box sx={{flex: '1 1 0', minWidth: 0}}>
                    <TabbedPanel
                        value={tab}
                        onChange={(next) => setTab(next as (typeof TABS)[number])}
                        tabs={[
                            {
                                value: 'map',
                                label: 'Map',
                                // fill + keepMounted: the map owns a WebGL
                                // context and its own camera. Unmounting it on
                                // a tab switch would throw both away and reset
                                // the view the user just panned to.
                                fill: true,
                                keepMounted: true,
                                content: (
                                    <FundingMapTab
                                        data={mapData}
                                        loading={mapLoading}
                                        selectedId={selectedId}
                                        onSelect={select}
                                        initialView={initialView}
                                        onViewChange={onViewChange}
                                    />
                                ),
                            },
                            {
                                value: 'organisation',
                                label: 'Organisation',
                                content: selectedOrganisation ? (
                                    <FundingOrganisationTab
                                        organisation={selectedOrganisation}
                                        projects={projects}
                                        page={projectsPage}
                                        onPageChange={setProjectsPage}
                                        loading={projectsLoading}
                                        onSelectProject={openProject}
                                    />
                                ) : (
                                    <EmptyTabMessage message="Select an organisation from the ranking or click a hexagon on the map." />
                                ),
                            },
                            {
                                value: 'programmes',
                                label: 'Programmes',
                                fill: true,
                                content: (
                                    <FundingProgrammesTab
                                        params={grantParams}
                                        selectedStream={selectedStream}
                                        onSortChange={(sort) => update({[SEARCH_PARAM.sort]: sort})}
                                        onPageChange={setGrantsPage}
                                        onFacetChange={(facet, values) => update({[SEARCH_PARAM[facet]]: values})}
                                        onSelectGrant={selectGrant}
                                        onClearStream={clearStream}
                                    />
                                ),
                            },
                        ]}
                    />
                </Box>
            </Box>
        </Box>
    )
}
