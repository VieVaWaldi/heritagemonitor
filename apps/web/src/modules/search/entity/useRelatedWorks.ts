'use client'

import {workSearchResponseSchema, type WorkSearchResponse} from '@heritagemonitor/shared'
import {useEffect, useState, useTransition} from 'react'
import {apiGet} from '@/common/api/apiClient'
import {useUrlDetailPage} from '@/common/url'
import {relatedPaths} from './relatedPaths'

const EMPTY: WorkSearchResponse = {
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

/**
 * The works of the selected project or organisation, most cited first.
 *
 * One hook for both, because it is one endpoint shape (`/v1/<entity>/:id/works`)
 * answered by the same works search on the api side. Page in the URL as
 * `dpage`, fetched only while the tab is open — a large institution has tens
 * of thousands of works.
 */
export function useRelatedWorks(entity: 'projects' | 'organisations', id: string | null, enabled: boolean, search = '') {
    const {page, setPage} = useUrlDetailPage()
    // Keyed by id AND the forwarded page filters: without the filters in the
    // key, narrowing a facet would leave the previous rows on screen.
    const fetchKey = id === null ? null : `${id}|${search}`
    const [fetched, setFetched] = useState<{id: string; data: WorkSearchResponse} | null>(null)
    const [loading, startTransition] = useTransition()

    useEffect(() => {
        if (!enabled || !id) return

        const controller = new AbortController()
        startTransition(async () => {
            try {
                const data = await apiGet(relatedPaths.works(entity, id, page, search), workSearchResponseSchema, {
                    signal: controller.signal,
                })
                setFetched({id: fetchKey!, data})
            } catch {
                // Superseded, or a transient failure: keep what is on screen.
            }
        })

        return () => controller.abort()
    }, [entity, id, fetchKey, search, page, enabled])

    return {works: enabled && fetchKey && fetched?.id === fetchKey ? fetched.data : EMPTY, page, setPage, loading}
}
