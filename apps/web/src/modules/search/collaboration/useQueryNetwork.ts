'use client'

import {queryNetworkResponseSchema, type QueryNetworkResponse} from '@heritagemonitor/shared'
import {useEffect, useState, useTransition} from 'react'
import {apiGet} from '@/common/api/apiClient'
import {queryNetworkPath} from './queryNetworkAdapter'

export const EMPTY_QUERY_NETWORK: QueryNetworkResponse = {
    nodes: [],
    edges: [],
    projects: {ids: [], orgs: [], topic: [], year: [], amount: [], funder: []},
    topics: [],
    funders: [],
    meta: {projectsScanned: 0, totalMatches: 0, totalCapped: false, approxTotal: null, edgesFound: 0, capped: false, withoutGeo: 0, mode: 'strict', didYouMean: [], complete: true},
}

/**
 * The query network for the page's q, corpus and project filters, capped at
 * `maxEdges`. Tagged with the request it answers: a network is never shown
 * against filters it was not computed for, and the previous one stays on
 * screen while the next is on its way (the first call after a restart can
 * take a few seconds).
 */
export function useQueryNetwork(filterQuery: string, maxEdges: number) {
    const key = `${filterQuery}|${maxEdges}`
    const [fetched, setFetched] = useState<{key: string; data: QueryNetworkResponse} | null>(null)
    const [error, setError] = useState<{key: string; message: string} | null>(null)
    const [pending, startTransition] = useTransition()

    useEffect(() => {
        const controller = new AbortController()
        startTransition(async () => {
            try {
                const data = await apiGet(queryNetworkPath(filterQuery, maxEdges), queryNetworkResponseSchema, {signal: controller.signal})
                setFetched({key, data})
                setError(null)
            } catch (caught) {
                // A 4xx is the api answering the user's own request (too many
                // topics in a link). Anything else is an abort or a transient
                // failure: keep what is on screen.
                if (caught instanceof Error && 'status' in caught && Number(caught.status) < 500) setError({key, message: caught.message})
            }
        })
        return () => controller.abort()
    }, [filterQuery, maxEdges, key])

    return {
        data: fetched?.data ?? EMPTY_QUERY_NETWORK,
        loading: pending || (fetched?.key !== key && error?.key !== key),
        error: error?.key === key ? error.message : null,
    }
}
