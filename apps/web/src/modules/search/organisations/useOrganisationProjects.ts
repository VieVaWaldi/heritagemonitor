'use client'

import {organisationProjectsResponseSchema, type OrganisationProjectsResponse} from '@heritagemonitor/shared'
import {useEffect, useState, useTransition} from 'react'
import {apiGet} from '@/common/api/apiClient'
import {useUrlDetailPage} from '@/common/url'
import {relatedPaths} from '../entity/relatedPaths'

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
export function useOrganisationProjects(organisationId: string | null, enabled: boolean, search = '') {
    const {page, setPage} = useUrlDetailPage()
    // Tagged with the organisation it belongs to, so one institution's
    // projects can never be shown under another's name while a request is in
    // flight. Paging WITHIN one keeps the previous page visible instead of
    // blanking.
    // Keyed by id AND the forwarded page filters — see useRelatedWorks.
    const fetchKey = organisationId === null ? null : `${organisationId}|${search}`
    const [fetched, setFetched] = useState<{organisationId: string; data: OrganisationProjectsResponse} | null>(null)
    const [loading, startTransition] = useTransition()

    useEffect(() => {
        if (!enabled || !organisationId) return

        const controller = new AbortController()
        startTransition(async () => {
            try {
                const data = await apiGet(
                    relatedPaths.organisationProjects(organisationId, page, search),
                    organisationProjectsResponseSchema,
                    {signal: controller.signal},
                )
                setFetched({organisationId: fetchKey!, data})
            } catch {
                // Superseded by a newer request, or a transient failure.
            }
        })

        return () => controller.abort()
    }, [organisationId, fetchKey, search, page, enabled])

    const projects = enabled && fetchKey && fetched?.organisationId === fetchKey ? fetched.data : EMPTY

    return {projects, page, setPage, loading}
}
