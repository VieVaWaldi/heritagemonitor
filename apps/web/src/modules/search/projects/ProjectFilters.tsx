'use client'

import type {YearRange} from '@heritagemonitor/shared'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import {FacetSection, FilterBar, FilterMenuButton, YearFilter} from '@/common/components'
import {Text} from '@/common/text'
import type {ProjectFacet} from './useProjectFacets'

export interface ProjectFiltersProps {
    facets: ProjectFacet[]
    /** Current selection per filter param — see useUrlFilters. */
    values: Readonly<Record<string, string[]>>
    onFilterChange: (param: string, values: string[]) => void
    years: YearRange | null
    onYearsChange: (value: YearRange | null) => void
    onLastNYears: (n: number) => void
    minYear: number
    maxYear: number
    yearHistogram: Record<string, number>
    /** How many topic values may still be added before MAX_URL_TOPICS is reached. */
    topicsAtCap: boolean
    maxTopics: number
    onReset: () => void
    hasActiveFilters: boolean
}

/**
 * The sidebar column: the year control first (it is the filter people reach
 * for most, and the histogram gives the whole result set a shape), then one
 * checkbox card per facet in the shared config's order.
 *
 * A facet with no buckets is dropped rather than rendered empty — `theme` is
 * only populated for a few thousand projects, so on most searches an empty
 * "Theme" card would be noise.
 */
export function ProjectFacetSidebar({
    facets,
    values,
    onFilterChange,
    years,
    onYearsChange,
    onLastNYears,
    minYear,
    maxYear,
    yearHistogram,
    topicsAtCap,
    maxTopics,
}: ProjectFiltersProps) {
    return (
        <>
            <YearFilter
                value={years}
                onChange={onYearsChange}
                onLastNYears={onLastNYears}
                min={minYear}
                max={maxYear}
                histogram={yearHistogram}
            />

            {facets
                // The searchable ones (programme, 4.5k values) live in the
                // filter bar as a menu — a checkbox list of 200 rows in a
                // 260px column is not a facet, it is a wall.
                .filter((facet) => !facet.config.searchable && facet.options.length > 0)
                .map((facet) => (
                    <FacetSection
                        key={facet.config.field}
                        label={facet.config.label}
                        options={facet.options}
                        value={values[facet.config.param] ?? []}
                        onChange={(next) => onFilterChange(facet.config.param, next)}
                    />
                ))}

            {topicsAtCap && (
                <Text variant="caption" color="text.secondary" sx={{px: 1}}>
                    Maximum of {maxTopics} topics selected — clear one to choose another.
                </Text>
            )}
        </>
    )
}

/**
 * The strip above the list: reset, then the same facets as pill menus. Every
 * facet appears in both places on purpose (the sidebar is for browsing what
 * is there, the bar is for seeing at a glance what is on), and `programme` is
 * only here, with its search field — 4.5k values need typing, not scrolling.
 */
export function ProjectFilterBar({facets, values, onFilterChange, onReset, hasActiveFilters}: ProjectFiltersProps) {
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
                .filter((facet) => facet.options.length > 0)
                .map((facet) => (
                    <FilterMenuButton
                        key={facet.config.field}
                        label={facet.config.label}
                        options={facet.options}
                        value={values[facet.config.param] ?? []}
                        onChange={(next) => onFilterChange(facet.config.param, next)}
                        searchPlaceholder={`Search ${facet.config.label.toLowerCase()}...`}
                    />
                ))}
        </FilterBar>
    )
}
