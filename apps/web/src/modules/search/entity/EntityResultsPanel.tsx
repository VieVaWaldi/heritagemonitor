'use client'

import Box from '@mui/material/Box'
import type {ReactNode} from 'react'
import {FacetSidebar} from '@/common/components'

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
 * The layout every entity's results panel shares: facet column, filter strip,
 * then list and detail side by side, all filling the height the route gives
 * them. Presentation only — no state, no data, no knowledge of which entity
 * it is showing (apps/web/RULES.md #7). Each entity panel fills the four
 * slots with its own components.
 */
export function EntityResultsPanel({facets, filters, notice, list, detail}: EntityResultsPanelProps) {
    return (
        <Box sx={{width: '80%', mx: 'auto', height: '100%', display: 'flex', gap: 3}}>
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
