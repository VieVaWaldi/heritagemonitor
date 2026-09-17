import {MINORITY_FACET_FIELDS, type MinorityFacetDistribution, type MinorityFacetField} from '@heritagemonitor/shared'
import type {FilterOption} from '@/common/components'
import {labelSourceClass} from './minorityFormat'

export interface MinorityFacetFieldOptions {
    field: MinorityFacetField
    label: string
    options: FilterOption[]
}

function buildOptions(distribution: MinorityFacetDistribution, field: string, labelFor: (value: string) => string): FilterOption[] {
    return Object.entries(distribution[field] ?? {})
        .map(([value, count]) => ({value, label: labelFor(value), count}))
        .sort((a, b) => a.label.localeCompare(b.label))
}

// source_class is the one facet field whose raw values need relabeling
// (manual_seed/indigenous_to_europe are internal pipeline vocabulary) —
// every other field's raw value is already the display label.
function labelForField(field: string): (value: string) => string {
    return field === 'source_class' ? labelSourceClass : (value) => value
}

// Shapes MINORITY_FACET_FIELDS (the shared field/label/tier config) into
// ready-to-render {field, label, options} entries, split by tier, given
// the current facetDistribution — the one place both MinoritiesResultsPanel's
// sidebar and filter bar get their facet UI config from, instead of each
// facet being hand-written twice in JSX.
export function useMinorityFacets(distribution: MinorityFacetDistribution) {
    const byTier = (tier: 'primary' | 'secondary') =>
        MINORITY_FACET_FIELDS.filter((f) => f.tier === tier).map((f) => ({
            field: f.field,
            label: f.label,
            options: buildOptions(distribution, f.field, labelForField(f.field)),
        }))

    return {
        primary: byTier('primary'),
        // Secondary facets with nothing to show are dropped here instead of
        // via an inline JSX conditional at each call site.
        secondary: byTier('secondary').filter((f) => f.options.length > 0),
    }
}
