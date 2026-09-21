'use client'

import {organisationProjectsResponseSchema, type OrganisationProjectsResponse} from '@heritagemonitor/shared'
import {useEffect, useState, useTransition} from 'react'
import {apiGet} from '@/common/api/apiClient'
import {useUrlDetailPage} from '@/common/url'

const EMPTY: OrganisationProjectsResponse = {
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
 * The projects of the selected organisation, one page at a time.
 *
 * Its page lives in the URL as `dpage`, separate from the results list's own
 * `page` and cleared when another organisation or another tab is opened (see
 * common/url's patchClearsDetailPage). Fetched only while the tab is open: an
 * institution can have tens of thousands of projects.
 */
export function useOrganisationProjects(organisationId: string | null, enabled: boolean) {
    const {page, setPage} = useUrlDetailPage()
    // Tagged with the organisation it belongs to, so one institution's
    // projects can never be shown under another's name while a request is in
    // flight. Paging WITHIN one keeps the previous page visible instead of
    // blanking.
    const [fetched, setFetched] = useState<{organisationId: string; data: OrganisationProjectsResponse} | null>(null)
    const [loading, startTransition] = useTransition()

    useEffect(() => {
        if (!enabled || !organisationId) return

        const controller = new AbortController()
        startTransition(async () => {
            try {
                const data = await apiGet(
                    `/v1/organisations/${encodeURIComponent(organisationId)}/projects?page=${page}`,
                    organisationProjectsResponseSchema,
                    {signal: controller.signal},
                )
                setFetched({organisationId, data})
            } catch {
                // Superseded by a newer request, or a transient failure.
            }
        })

        return () => controller.abort()
    }, [organisationId, page, enabled])

    const projects = enabled && organisationId && fetched?.organisationId === organisationId ? fetched.data : EMPTY

    return {projects, page, setPage, loading}
}
