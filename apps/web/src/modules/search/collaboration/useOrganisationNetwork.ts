'use client'

import {
    organisationDetailSchema,
    organisationNetworkResponseSchema,
    type OrganisationDetail,
    type OrganisationNetworkResponse,
} from '@heritagemonitor/shared'
import {useEffect, useState, useTransition} from 'react'
import {apiGet} from '@/common/api/apiClient'
import {networkPath} from './networkAdapter'

export const EMPTY_NETWORK: OrganisationNetworkResponse = {
    nodes: [],
    edges: [],
    meta: {partners: 0, withoutGeo: 0, capped: false, complete: true},
}

/**
 * The network of one organisation under the page's project filters.
 *
 * Tagged with the centre AND the request it answers, so a network is never
 * shown under another organisation's name: another centre reads as empty
 * (loading) until its own arrives, while a filter change keeps the current
 * network on screen until the narrowed one replaces it.
 */
export function useOrganisationNetwork(centreId: string | null, filterQuery: string) {
    const [fetched, setFetched] = useState<{centreId: string; key: string; data: OrganisationNetworkResponse} | null>(null)
    const [error, setError] = useState<{key: string; message: string} | null>(null)
    const [loading, startTransition] = useTransition()
    const key = centreId ? `${centreId}|${filterQuery}` : ''

    useEffect(() => {
        if (!centreId) return
        const controller = new AbortController()
        startTransition(async () => {
            try {
                const data = await apiGet(networkPath(centreId, filterQuery), organisationNetworkResponseSchema, {signal: controller.signal})
                setFetched({centreId, key, data})
                setError(null)
            } catch (caught) {
                // A 4xx is the api answering the user's own request (an unknown
                // organisation id in a link). Anything else is an abort or a
                // transient failure: keep what is on screen.
                if (caught instanceof Error && 'status' in caught && Number(caught.status) < 500) setError({key, message: caught.message})
            }
        })
        return () => controller.abort()
    }, [centreId, filterQuery, key])

    const data = centreId && fetched?.centreId === centreId ? fetched.data : EMPTY_NETWORK
    return {data, loading: loading || (centreId !== null && fetched?.key !== key && error?.key !== key), error: error?.key === key ? error.message : null}
}

/** The full record of one organisation, for the detail tab's overview. */
export function useOrganisationDetail(id: string | null) {
    const [fetched, setFetched] = useState<{id: string; detail: OrganisationDetail} | null>(null)
    const [, startTransition] = useTransition()

    useEffect(() => {
        if (!id) return
        const controller = new AbortController()
        startTransition(async () => {
            try {
                const detail = await apiGet(`/v1/organisations/${encodeURIComponent(id)}`, organisationDetailSchema, {signal: controller.signal})
                setFetched({id, detail})
            } catch {
                // Superseded, or the record is gone: the panel shows nothing rather than a stale one.
            }
        })
        return () => controller.abort()
    }, [id])

    return id !== null && fetched?.id === id ? fetched.detail : null
}
