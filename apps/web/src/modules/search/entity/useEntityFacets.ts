import type {FacetConfig, FacetDistribution, FacetLabels} from '@heritagemonitor/shared'
import {useMemo} from 'react'
import type {FilterOption} from '@/common/components'

export interface EntityFacet {
    config: FacetConfig
    options: FilterOption[]
    /**
     * Overrides where a searchable facet's type-ahead fetches from. Works'
     * publishers come from an in-memory table rather than an aggregation, so
     * they cannot use the generic facet-values endpoint.
     */
    valuesEndpoint?: (searchText: string, apiParams: string) => string
}

/**
 * Turns the api's raw `{field: {value: count}}` into ready-to-render options,
 * for any entity: the shaping depends only on the facet config shape, never on
 * which entity declared it.
 *
 * Ordered by count, not alphabetically. A facet's whole job is to show where
 * the results are, the api already returns only the top N buckets per field,
 * and JSON does not preserve bucket order for numeric-looking keys (topic
 * ids), so the order is re-established here rather than trusted.
 *
 * Labels come from the api's `facetLabels` wherever the raw value is an id;
 * everything else is already its own label.
 */
export function useEntityFacets(
    configs: readonly FacetConfig[],
    distribution: FacetDistribution,
    labels: FacetLabels,
): EntityFacet[] {
    return useMemo(
        () =>
            configs.map((config) => ({
                config,
                options: Object.entries(distribution[config.field] ?? {})
                    .map(([value, count]) => ({value, label: labels[config.field]?.[value] ?? value, count}))
                    .sort((a, b) => b.count - a.count),
            })),
        [configs, distribution, labels],
    )
}

/**
 * The human label for a filter VALUE — for the chat context and any chip that
 * shows a selection rather than a bucket (a selected topic id would otherwise
 * read as "13718").
 */
export function labelFacetValue(facet: EntityFacet, value: string): string {
    return facet.options.find((option) => option.value === value)?.label ?? value
}
