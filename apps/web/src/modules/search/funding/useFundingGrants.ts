'use client'

import {grantSearchResponseSchema, type GrantSearchResponse} from '@heritagemonitor/shared'
import {useEffect, useState, useTransition} from 'react'
import {apiGet} from '@/common/api/apiClient'

const EMPTY: GrantSearchResponse = {
    hits: [],
    facetDistribution: {},
    facetLabels: {},
    estimatedTotalHits: 0,
    totalCapped: false,
    approxTotal: null,
    mode: 'strict',
    didYouMean: [],
    page: 1,
    pageCount: 1,
}

export interface FundingGrantsParams {
    corpus: string | undefined
    funder: string[]
    programme: string[]
    jurisdiction: string[]
    sort: 'dchProjects' | 'funding'
    page: number
}

/**
 * The grant picker's own list.
 *
 * Deliberately NOT the page's `q`: the text box on this page searches the
 * projects whose money is being mapped, and reusing it here would empty the
 * picker as soon as someone typed a research term that no programme name
 * contains. The picker is browsed with its menus instead.
 *
 * Fetched only while the tab is open — it is a third request on a page that
 * already makes two.
 */
export function useFundingGrants(params: FundingGrantsParams, enabled: boolean) {
    const search = new URLSearchParams()
    if (params.corpus) search.set('c', params.corpus)
    for (const value of params.funder) search.append('funder', value)
    for (const value of params.programme) search.append('programme', value)
    for (const value of params.jurisdiction) search.append('jurisdiction', value)
    search.set('sort', params.sort)
    if (params.page > 1) search.set('page', String(params.page))
    const queryString = search.toString()

    const [data, setData] = useState(EMPTY)
    const [loading, startTransition] = useTransition()

    useEffect(() => {
        if (!enabled) return

        const controller = new AbortController()
        startTransition(async () => {
            try {
                setData(await apiGet(`/v1/grants/search?${queryString}`, grantSearchResponseSchema, {signal: controller.signal}))
            } catch {
                // Superseded or transient — the previous page stays on screen.
            }
        })
        return () => controller.abort()
    }, [queryString, enabled])

    return {data, loading}
}
