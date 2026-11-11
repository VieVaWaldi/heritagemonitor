'use client'

import Box from '@mui/material/Box'
import type {ReactNode} from 'react'
import {FacetSidebar} from '@/common/components'
import {useIsMobile} from '@/common/hooks/useIsMobile'
import {MobilePaneSwitcher, MOBILE_PANE_SWITCHER_HEIGHT} from './MobilePaneSwitcher'

/**
 * The outer block of every search page: facets, list and detail. It takes ALL
 * the width its parent gives it and starts at the left edge (a small gutter
 * only) — it used to be an 80% column centred in the page, which left dead
 * bands on both sides on a wide screen.
 *
 * Making room for Lucy's side panel is NOT done here: the page shell
 * (UseCaseSearchPage) gives its content column a right margin equal to the
 * panel's width while it is open (useLlmChatContentSx, one width constant in
 * LlmChatRuntime), so this block simply fills what is left and shrinks
 * leftwards when the panel opens. Desktop only — mobile's layout (below)
 * doesn't have a facet column to leave room beside.
 */
const DESKTOP_BLOCK_SX = {width: '100%', px: 3, height: '100%', display: 'flex', gap: 3} as const

export interface EntityResultsPanelProps {
    /** FacetSections for the left column. Omitted while an entity has no facets in the UI yet. */
    facets?: ReactNode
    /** A FilterBar above the list. Omitted the same way. */
    filters?: ReactNode
    /** Full-width message above both columns — e.g. why the current request could not be served. */
    notice?: ReactNode
    /** The PaginatedList. */
    list: ReactNode
    /** The TabbedPanel with the selected row's detail. */
    detail: ReactNode
}

/**
 * The layout every entity's results panel shares — facets, filters, list and
 * detail, from Projects/Organisations/Works/Grants/Experts/Minorities to the
 * collaboration and funding panels, which build the same four slots by hand
 * rather than taking a facet-shaped prop (see each one's own facets/filters
 * JSX passed in below). Presentation only — no state, no data, no knowledge
 * of which entity it is showing (apps/web/RULES.md #7).
 *
 * Desktop: facet column, filter strip, list and detail side by side, all
 * filling the route's height — unchanged from before mobile existed.
 *
 * Mobile: there is only room for one of {facets, list, detail} at a time, so
 * they become a single sliding pane switched by a fixed bottom bar
 * (MobilePaneSwitcher, which also auto-advances to Detail on a new
 * selection) — filters stay above it, full width, since EntityFilterBar/
 * FilterBar already keep themselves to one row with horizontal overflow
 * scroll instead of wrapping and growing.
 */
export function EntityResultsPanel({facets, filters, notice, list, detail}: EntityResultsPanelProps) {
    const isMobile = useIsMobile()

    if (isMobile) {
        return (
            <Box sx={{width: '100%', px: 1.5, height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5, pb: `${MOBILE_PANE_SWITCHER_HEIGHT}px`}}>
                {filters}
                {notice}
                <MobilePaneSwitcher facets={facets} list={list} detail={detail} />
            </Box>
        )
    }

    return (
        <Box sx={DESKTOP_BLOCK_SX}>
            {facets && <FacetSidebar>{facets}</FacetSidebar>}

            <Box sx={{flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2}}>
                {filters}
                {notice}

                <Box sx={{flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 3}}>
                    <Box sx={{flex: '1 1 0', minWidth: 0}}>{list}</Box>
                    <Box sx={{flex: '1 1 0', minWidth: 0}}>{detail}</Box>
                </Box>
            </Box>
        </Box>
    )
}
