import {
    PROJECT_FACET_FIELDS,
    PROJECT_YEAR_HISTOGRAM,
    type FacetDistribution,
    type FacetLabels,
    type ProjectFacetConfig,
} from '@heritagemonitor/shared'
import {useMemo} from 'react'
import type {FilterOption} from '@/common/components'

export interface ProjectFacet {
    config: ProjectFacetConfig
    options: FilterOption[]
}

/**
 * Turns the api's raw `{field: {value: count}}` into ready-to-render options.
 *
 * Ordered by count, not alphabetically: a facet's whole job is to show where
 * the results actually are, and the api already returns only the top N
 * buckets per field, so an alphabetical list would hide the big ones behind
 * whatever happens to start with "A".
 *
 * Labels come from the api's `facetLabels` where the raw value is an id
 * (topics); everything else is already its own label.
 */
export function useProjectFacets(distribution: FacetDistribution, labels: FacetLabels) {
    const facets = useMemo<ProjectFacet[]>(
        () =>
            PROJECT_FACET_FIELDS.map((config) => ({
                config,
                options: Object.entries(distribution[config.field] ?? {})
                    .map(([value, count]) => ({value, label: labels[config.field]?.[value] ?? value, count}))
                    .sort((a, b) => b.count - a.count),
            })),
        [distribution, labels],
    )

    // Memoized for the same reason as `facets`: an object identity that
    // changes every render propagates into memos and effects downstream.
    const yearHistogram = useMemo(() => distribution[PROJECT_YEAR_HISTOGRAM] ?? {}, [distribution])

    return {facets, yearHistogram}
}

/**
 * The human label for a filter value, for the chat context and any chip that
 * shows a selected value rather than a bucket (a selected topic id would
 * otherwise read as "13718").
 */
export function labelFacetValue(facet: ProjectFacet, value: string): string {
    return facet.options.find((option) => option.value === value)?.label ?? value
}
