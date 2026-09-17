'use client'

import {useEffect, useState, useTransition} from 'react'
import {useSearchParams} from 'next/navigation'
import {
    MINORITY_FACET_FIELDS,
    minoritySearchResponseSchema,
    type MinorityDto,
    type MinorityFacetDistribution,
    type MinorityFacetField,
    type MinoritySearchRequest,
    type MinoritySortOption,
} from '@heritagemonitor/shared'
import {apiGet} from '@/common/api/apiClient'
import {SEARCH_PARAM} from '@/common/url'

// Field names come from the shared facet config (see MINORITY_FACET_FIELDS)
// rather than being hand-listed again here — the same seven fields drive
// apps/api's facet request, this hook's filter state, and useMinorityFacets'
// UI shaping, all from one place.
const ARRAY_FILTER_FIELDS = MINORITY_FACET_FIELDS.map((f) => f.field)

export type MinorityFilters = Record<MinorityFacetField, string[]> & {
    has_subgroups: boolean
}

export const EMPTY_MINORITY_FILTERS: MinorityFilters = {
    ...(Object.fromEntries(ARRAY_FILTER_FIELDS.map((field): [MinorityFacetField, string[]] => [field, []])) as Record<
        MinorityFacetField,
        string[]
    >),
    has_subgroups: false,
}

// Builds the typed wire request first, then serializes it — so adding a
// field to MinoritySearchRequest (packages/shared) never needs a matching
// change here; only fields actually present on the request end up in the
// query string.
function toSearchRequest(
    q: string,
    filters: MinorityFilters,
    page: number,
    sort: MinoritySortOption | null,
): MinoritySearchRequest {
    const request: MinoritySearchRequest = {page}
    if (q) request.q = q
    for (const field of ARRAY_FILTER_FIELDS) {
        if (filters[field].length > 0) request[field] = filters[field]
    }
    if (filters.has_subgroups) request.has_subgroups = true
    if (sort) request.sort = sort
    return request
}

function buildQueryString(request: MinoritySearchRequest): string {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(request)) {
        if (value == null) continue
        if (Array.isArray(value)) for (const v of value) params.append(key, v)
        else params.set(key, String(value))
    }
    return params.toString()
}

export interface MinoritySearchState {
    filters: MinorityFilters
    page: number
    sort: MinoritySortOption | null
    setArrayFilter: (field: MinorityFacetField, value: string[]) => void
    setHasSubgroups: (value: boolean) => void
    setSort: (value: MinoritySortOption | null) => void
    resetFilters: () => void
    setPage: (page: number) => void
    hits: MinorityDto[]
    facetDistribution: MinorityFacetDistribution
    estimatedTotalHits: number
    pageCount: number
    loading: boolean
}

type MinoritySearchData = Pick<MinoritySearchState, 'hits' | 'facetDistribution' | 'estimatedTotalHits' | 'pageCount'>

const INITIAL_DATA: MinoritySearchData = {
    hits: [],
    facetDistribution: {},
    estimatedTotalHits: 0,
    pageCount: 1,
}

// Owns both "what is the user currently searching for" (filters + page —
// every setter but setPage resets page to 1, since they're inherently
// coupled) and the fetch driven by that state. `q` is read straight from
// the URL (same SEARCH_PARAM.query SearchNav's own useUseCaseSearch reads)
// rather than re-running that whole hook here — this avoids a second copy
// of its entity/corpus-sync side effects, and this hook only ever needs the
// query text, not the rest of that state.
export function useMinoritySearch(): MinoritySearchState {
    const searchParams = useSearchParams()
    const q = searchParams.get(SEARCH_PARAM.query) ?? ''

    const [filters, setFilters] = useState<MinorityFilters>(EMPTY_MINORITY_FILTERS)
    const [page, setPage] = useState(1)
    const [sort, setSortValue] = useState<MinoritySortOption | null>(null)
    const [data, setData] = useState<MinoritySearchData>(INITIAL_DATA)
    // useTransition's `loading` is set by React itself around the async
    // callback below, so this hook never calls setState synchronously
    // inside the effect body (see https://react.dev/learn/you-might-not-need-an-effect).
    const [loading, startTransition] = useTransition()

    function setArrayFilter(field: MinorityFacetField, value: string[]) {
        setFilters((prev) => ({...prev, [field]: value}))
        setPage(1)
    }

    function setHasSubgroups(value: boolean) {
        setFilters((prev) => ({...prev, has_subgroups: value}))
        setPage(1)
    }

    function setSort(value: MinoritySortOption | null) {
        setSortValue(value)
        setPage(1)
    }

    function resetFilters() {
        setFilters(EMPTY_MINORITY_FILTERS)
        setPage(1)
    }

    useEffect(() => {
        const controller = new AbortController()

        startTransition(async () => {
            try {
                const response = await apiGet(
                    `/v1/minorities/search?${buildQueryString(toSearchRequest(q, filters, page, sort))}`,
                    minoritySearchResponseSchema,
                    {signal: controller.signal},
                )
                setData({
                    hits: response.hits,
                    facetDistribution: response.facetDistribution,
                    estimatedTotalHits: response.estimatedTotalHits,
                    pageCount: response.pageCount,
                })
            } catch {
                // Aborted (superseded by a newer request) or a transient
                // network error — leave the previous page of results in
                // place rather than flashing an empty list.
            }
        })

        return () => controller.abort()
    }, [q, page, filters, sort])

    return {
        filters,
        page,
        sort,
        setArrayFilter,
        setHasSubgroups,
        setSort,
        resetFilters,
        setPage,
        ...data,
        loading,
    }
}
