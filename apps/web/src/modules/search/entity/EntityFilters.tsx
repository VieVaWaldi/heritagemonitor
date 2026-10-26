'use client'

import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import type {ReactNode} from 'react'
import type {EntityKey} from '@/common/catalog'
import {FacetSection, FilterBar, FilterMenuButton} from '@/common/components'
import {FacetValuesMenuButton} from './FacetValuesMenuButton'
import {facetHint, facetTitle} from './facetTitles'
import type {EntityFacet} from './useEntityFacets'

export interface EntityFiltersProps {
    entity: EntityKey
    facets: EntityFacet[]
    /** Current selection per filter param — see useUrlFilters. */
    values: Readonly<Record<string, string[]>>
    onFilterChange: (param: string, values: string[]) => void
    onReset: () => void
    hasActiveFilters: boolean
    /** Rendered above the facet cards — e.g. the projects year control. */
    sidebarHeader?: ReactNode
    /** Rendered below them. */
    sidebarFooter?: ReactNode
    /**
     * Extra control pinned INSIDE one facet's card, above its checkboxes —
     * keyed by the facet's URL param. The topic browser lives here rather than
     * at the bottom of the column: it belongs to the Topic facet, and at the
     * foot of a scrolling sidebar it was below the fold on every page.
     */
    facetHeaders?: Readonly<Record<string, ReactNode>>
    /**
     * Which page's wording the facet titles use — see ./facetTitles. Defaults
     * to the entity, which is right for everything on `/search`; the use-case
     * routes (experts, funding, minorities) pass their own key.
     */
    titleKey?: string
}

/**
 * The facet column, for any entity: whatever the entity puts on top, then one
 * checkbox card per facet in its config's order.
 *
 * A facet with no buckets is dropped rather than rendered empty (`theme` only
 * covers a few thousand projects, so on most searches an empty card would be
 * noise) — unless something in it is still selected, which must stay visible
 * and un-tickable-away.
 */
export function EntityFacetSidebar({
    entity,
    facets,
    values,
    onFilterChange,
    sidebarHeader,
    sidebarFooter,
    facetHeaders,
    titleKey,
}: EntityFiltersProps) {
    const pageKey = titleKey ?? entity
    return (
        <>
            {sidebarHeader}

            {facets
                // The searchable ones (thousands of values) live in the filter
                // bar as a type-ahead menu — a 200-row checkbox list in a
                // 260px column is not a facet, it is a wall.
                .filter((facet) => !facet.config.searchable && facet.options.length > 0)
                .map((facet) => (
                    <FacetSection
                        key={facet.config.field}
                        label={facetTitle(pageKey, facet.config.param, facet.config.label)}
                        header={facetHeaders?.[facet.config.param]}
                        hint={facetHint(facet.config.param)}
                        options={facet.options}
                        value={values[facet.config.param] ?? []}
                        onChange={(next) => onFilterChange(facet.config.param, next)}
                    />
                ))}

            {sidebarFooter}
        </>
    )
}

/**
 * The strip above the list: reset, then the same facets as pill menus. Every
 * facet appears in both places on purpose — the sidebar is for browsing what
 * is there, the bar is for seeing at a glance what is on — and the ones with
 * thousands of values are only here, with their search field.
 */
export function EntityFilterBar({
    entity,
    facets,
    values,
    onFilterChange,
    onReset,
    hasActiveFilters,
}: EntityFiltersProps) {
    return (
        <FilterBar>
            <Tooltip title="Reset all filters">
                <span>
                    <IconButton size="small" onClick={onReset} disabled={!hasActiveFilters} aria-label="Reset all filters">
                        <RestartAltIcon fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>

            {facets
                .filter((facet) => facet.options.length > 0 || (values[facet.config.param] ?? []).length > 0)
                .map((facet) =>
                    facet.config.searchable ? (
                        <FacetValuesMenuButton
                            key={facet.config.field}
                            entity={entity}
                            facet={facet.config.param}
                            label={facet.config.label}
                            value={values[facet.config.param] ?? []}
                            onChange={(next) => onFilterChange(facet.config.param, next)}
                            fallbackOptions={facet.options}
                            endpoint={facet.valuesEndpoint}
                        />
                    ) : (
                        <FilterMenuButton
                            key={facet.config.field}
                            label={facet.config.label}
                            options={facet.options}
                            value={values[facet.config.param] ?? []}
                            onChange={(next) => onFilterChange(facet.config.param, next)}
                            searchPlaceholder={`Search ${facet.config.label.toLowerCase()}...`}
                            hint={facetHint(facet.config.param)}
                        />
                    ),
                )}
        </FilterBar>
    )
}
