'use client'

import {projectSearchResponseSchema, type ProjectSearchResponse} from '@heritagemonitor/shared'
import {useEffect, useState, useTransition} from 'react'
import {apiGet} from '@/common/api/apiClient'
import {useUrlDetailPage} from '@/common/url'
import {relatedPaths} from '../entity/relatedPaths'

const EMPTY: ProjectSearchResponse = {
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
 * The projects funded by the selected stream, one page at a time.
 *
 * Straight to `/v1/projects/search?stream=<id>`, not to a grants endpoint: a
 * stream id IS a value of the projects index's `funding_stream_ids`, so this
 * is an ordinary project search with one filter — with that route's ranking,
 * paging and row shape for free. A dedicated endpoint would be the same query
 * with fewer features.
 *
 * Its page lives in the URL as `dpage`, cleared when another stream or another
 * tab is opened (see common/url's patchClearsDetailPage), and it is fetched
 * only while the tab is open: the biggest streams have tens of thousands of
 * projects.
 */
export function useGrantProjects(grantId: string | null, corpus: string | undefined, enabled: boolean, search = '') {
    const {page, setPage} = useUrlDetailPage()
    // Tagged with the stream it belongs to, so one programme's projects can
    // never be shown under another's name while a request is in flight.
    const fetchKey = `${grantId ?? ''}|${search}`
    const [fetched, setFetched] = useState<{grantId: string; data: ProjectSearchResponse} | null>(null)
    const [loading, startTransition] = useTransition()

    useEffect(() => {
        if (!enabled || !grantId) return

        const controller = new AbortController()
        // The page's own filters first, then this list's own two params — see
        // entity/relatedParams for what carries and why `q` does not.

        startTransition(async () => {
            try {
                const data = await apiGet(relatedPaths.grantProjects(grantId, corpus, page, search), projectSearchResponseSchema, {
                    signal: controller.signal,
                })
                setFetched({grantId: fetchKey, data})
            } catch {
                // Superseded by a newer request, or a transient failure.
            }
        })

        return () => controller.abort()
    }, [grantId, corpus, page, enabled, search, fetchKey])

    const projects = enabled && grantId && fetched?.grantId === fetchKey ? fetched.data : EMPTY

    return {projects, page, setPage, loading}
}
