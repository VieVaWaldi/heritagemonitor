'use client'

import {facetValuesResponseSchema, type FacetValue} from '@heritagemonitor/shared'
import {useEffect, useState} from 'react'
import {apiGet} from '@/common/api/apiClient'
import type {EntityKey} from '@/common/catalog'
import {FilterMenuButton, type FilterOption} from '@/common/components'
import {facetHint} from './facetTitles'
import {toApiSearchParams, useUrlState} from '@/common/url'

const DEBOUNCE_MS = 200

export interface FacetValuesMenuButtonProps {
    entity: EntityKey
    /** The URL param this facet filters on, e.g. `programme`. */
    facet: string
    label: string
    value: string[]
    onChange: (next: string[]) => void
    /**
     * The top buckets already in the search response — shown before the user
     * types anything, so opening the menu costs no request.
     */
    fallbackOptions: FilterOption[]
    /**
     * Where the type-ahead fetches from, given the typed text and the page's
     * own api params. Defaults to `/v1/<entity>/facet-values`; works override
     * it because their publisher list is an in-memory table rather than an
     * aggregation (50M documents — see the works repository).
     */
    endpoint?: (searchText: string, apiParams: string) => string
}

/**
 * A filter menu for a facet with too many values to ship with the search
 * (`programme` has ~4,500). Typing queries `/v1/<entity>/facet-values` under
 * the page's OWN search params, so the counts next to each value are the
 * counts the user would get by picking it — a static value list could not say
 * that, which is the whole reason this is a server call.
 */
function defaultEndpoint(entity: EntityKey, facet: string) {
    return (searchText: string, apiParams: string) =>
        `/v1/${entity}/facet-values?${apiParams}&facet=${encodeURIComponent(facet)}&facetQ=${encodeURIComponent(searchText)}`
}

export function FacetValuesMenuButton({
    entity,
    facet,
    label,
    value,
    onChange,
    fallbackOptions,
    endpoint,
}: FacetValuesMenuButtonProps) {
    const {params} = useUrlState()
    const searchParams = toApiSearchParams(params)

    const [text, setText] = useState('')
    const trimmed = text.trim()
    // Tagged with the text it answers, so "what is on screen" is derived
    // rather than cleared and re-set: clearing an empty search would be a
    // setState inside the effect, and a late response for an older keystroke
    // can never overwrite a newer one.
    const [fetched, setFetched] = useState<{text: string; values: FacetValue[]} | null>(null)

    useEffect(() => {
        if (!trimmed) return

        const controller = new AbortController()
        const timer = setTimeout(() => {
            apiGet((endpoint ?? defaultEndpoint(entity, facet))(trimmed, searchParams), facetValuesResponseSchema, {
                signal: controller.signal,
            })
                .then((response) => setFetched({text: trimmed, values: response.values}))
                // Superseded or a transient failure: keep whatever is shown.
                .catch(() => {})
        }, DEBOUNCE_MS)

        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [entity, facet, trimmed, searchParams, endpoint])

    const matches = trimmed && fetched?.text === trimmed ? fetched.values : null
    // Typed something, nothing back for it yet: that is exactly "searching".
    const loading = Boolean(trimmed) && matches === null

    // A value that is already ticked must stay visible even when it does not
    // match what is being typed — otherwise it looks as though it was lost.
    const options: FilterOption[] = matches ?? fallbackOptions
    const selectedMissing = value
        .filter((selected) => !options.some((option) => option.value === selected))
        .map((selected) => ({value: selected, label: selected}))

    return (
        <FilterMenuButton
            label={label}
            options={[...selectedMissing, ...options]}
            value={value}
            onChange={onChange}
            onSearchTextChange={setText}
            loading={loading}
            searchPlaceholder={`Search ${label.toLowerCase()}...`}
            hint={facetHint(facet)}
        />
    )
}
