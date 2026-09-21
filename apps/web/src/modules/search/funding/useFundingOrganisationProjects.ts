'use client'

import {projectSearchResponseSchema, type ProjectSearchResponse} from '@heritagemonitor/shared'
import {useEffect, useState, useTransition} from 'react'
import {apiGet} from '@/common/api/apiClient'
import {toApiSearchParams, useUrlDetailPage, useUrlState} from '@/common/url'

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
 * The selected organisation's projects AMONG THE MATCHES — not all of them.
 *
 * The page's own filters are forwarded and `org=<id>` is added, so the list
 * answers "which of these projects is this organisation's share of", which is
 * the number the ranking next to it was computed from. Asking
 * `/organisations/:id/projects` instead would show its whole history and
 * silently disagree with the euro figure on the row.
 *
 * Fetched only while the tab is open; its page is the detail panel's own
 * `dpage`.
 */
export function useFundingOrganisationProjects(organisationId: string | null, enabled: boolean) {
    const {params} = useUrlState()
    const {page, setPage} = useUrlDetailPage()

    const search = new URLSearchParams(toApiSearchParams(params))
    search.delete('page')
    if (organisationId) search.set('org', organisationId)
    search.set('page', String(page))
    // The strict search only: this list belongs to the ranking's count for this
    // organisation (see relatedPaths.STRICT).
    search.set('strict', 'true')
    const queryString = search.toString()

    // Tagged with the organisation it belongs to, so one institution's
    // projects can never be shown under another's name while a request is in
    // flight.
    const [fetched, setFetched] = useState<{organisationId: string; data: ProjectSearchResponse} | null>(null)
    const [loading, startTransition] = useTransition()

    useEffect(() => {
        if (!enabled || !organisationId) return

        const controller = new AbortController()
        startTransition(async () => {
            try {
                const data = await apiGet(`/v1/projects/search?${queryString}`, projectSearchResponseSchema, {
                    signal: controller.signal,
                })
                setFetched({organisationId, data})
            } catch {
                // Superseded by a newer request, or a transient failure.
            }
        })
        return () => controller.abort()
    }, [organisationId, queryString, enabled])

    const projects = enabled && organisationId && fetched?.organisationId === organisationId ? fetched.data : EMPTY
    return {projects, page, setPage, loading}
}
