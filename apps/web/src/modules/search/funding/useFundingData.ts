'use client'

import {
    fundingMapResponseSchema,
    fundingOrganisationsResponseSchema,
    type FundingMapResponse,
    type FundingOrganisationsResponse,
} from '@heritagemonitor/shared'
import {useEffect, useState, useTransition} from 'react'
import {apiGet} from '@/common/api/apiClient'
import {toApiSearchParams, useUrlState} from '@/common/url'

// The page's two fetches. Both read the SAME filters out of the URL, so the
// list and the map can never show different worlds — see the api's
// funding.routes.ts, which shares one query definition for the same reason.

const EMPTY_ORGANISATIONS: FundingOrganisationsResponse = {
    hits: [],
    facetDistribution: {},
    estimatedTotalHits: 0,
    page: 1,
    pageCount: 1,
    capped: false,
    geolocated: 0,
    totalFundingEur: 0,
    complete: true,
}

const EMPTY_MAP: FundingMapResponse = {orgs: [], ranked: 0, complete: true}

export function useFundingOrganisations(): {data: FundingOrganisationsResponse; loading: boolean; error: string | null} {
    const {params} = useUrlState()
    const queryString = toApiSearchParams(params)

    // Tagged with the request it answers: a response that arrives after the
    // filters moved on must not be rendered against them.
    const [fetched, setFetched] = useState<{key: string; data: FundingOrganisationsResponse} | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, startTransition] = useTransition()
    const data = fetched?.key === queryString ? fetched.data : (fetched?.data ?? EMPTY_ORGANISATIONS)

    useEffect(() => {
        const controller = new AbortController()
        startTransition(async () => {
            try {
                const response = await apiGet(`/v1/funding/organisations?${queryString}`, fundingOrganisationsResponseSchema, {
                    signal: controller.signal,
                })
                setFetched({key: queryString, data: response})
                setError(null)
            } catch (caught) {
                // A 4xx is the api telling the user about their own request
                // (a page past the ranked set). Anything else is an abort or a
                // transient failure: keep the previous page of results.
                if (caught instanceof Error && 'status' in caught && Number(caught.status) < 500) setError(caught.message)
            }
        })
        return () => controller.abort()
    }, [queryString])

    return {data, loading, error}
}

/**
 * The map's points. A separate request from the list's page, on purpose: the
 * map wants all 500 at once and only changes when the FILTERS change, while
 * the list changes on every page turn. Dropping `page` from the key is what
 * stops a page turn from refetching 500 points.
 */
export function useFundingMap(): {data: FundingMapResponse; loading: boolean} {
    const {params} = useUrlState()
    const mapParams = new URLSearchParams(toApiSearchParams(params))
    mapParams.delete('page')
    const queryString = mapParams.toString()

    // Tagged with the request it answers. Untagged, a superseded map response
    // (or a failed one, which this hook deliberately swallows) left the
    // PREVIOUS points on the map while the list beside it had already moved
    // on — the "list shows 9, map shows hundreds" bug.
    const [fetched, setFetched] = useState<{key: string; data: FundingMapResponse} | null>(null)
    const [loading, startTransition] = useTransition()

    useEffect(() => {
        const controller = new AbortController()
        startTransition(async () => {
            try {
                const response = await apiGet(`/v1/funding/map?${queryString}`, fundingMapResponseSchema, {
                    signal: controller.signal,
                })
                setFetched({key: queryString, data: response})
            } catch {
                // Superseded or transient — the previous points stay on screen
                // only until the matching response lands (see the key check).
            }
        })
        return () => controller.abort()
    }, [queryString])

    return {data: fetched?.key === queryString ? fetched.data : EMPTY_MAP, loading}
}
