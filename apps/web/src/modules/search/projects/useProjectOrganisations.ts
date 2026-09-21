'use client'

import {projectOrganisationsResponseSchema, type ProjectOrganisationsResponse} from '@heritagemonitor/shared'
import {useEffect, useState, useTransition} from 'react'
import {apiGet} from '@/common/api/apiClient'
import {useUrlDetailPage} from '@/common/url'
import {relatedPaths} from '../entity/relatedPaths'

const EMPTY: ProjectOrganisationsResponse = {hits: [], estimatedTotalHits: 0, page: 1, pageCount: 1}

/**
 * The organisations of the selected project, one page at a time.
 *
 * Its page lives in the URL as `dpage`, separate from the results list's own
 * `page` and cleared automatically when another project or another tab is
 * opened (see common/url's patchClearsDetailPage) — so a link to "page 2 of
 * this project's partners" works, and switching rows never lands on page 2 of
 * a list that has three entries.
 *
 * Fetched only while the tab is actually open: a project can have hundreds of
 * organisations, and nobody should pay for that to read the overview.
 */
export function useProjectOrganisations(projectId: string | null, enabled: boolean) {
    const {page, setPage} = useUrlDetailPage()
    // Tagged with the project it belongs to, so a page of one project's
    // partners can never be shown under another project's name while the new
    // request is still in flight. Paging WITHIN a project deliberately keeps
    // the previous page visible instead of blanking.
    const [fetched, setFetched] = useState<{projectId: string; data: ProjectOrganisationsResponse} | null>(null)
    const [loading, startTransition] = useTransition()

    useEffect(() => {
        if (!enabled || !projectId) return

        const controller = new AbortController()
        startTransition(async () => {
            try {
                const data = await apiGet(
                    relatedPaths.projectOrganisations(projectId, page),
                    projectOrganisationsResponseSchema,
                    {signal: controller.signal},
                )
                setFetched({projectId, data})
            } catch {
                // Superseded by a newer request, or a transient failure: keep
                // what is on screen rather than flashing an empty list.
            }
        })

        return () => controller.abort()
    }, [projectId, page, enabled])

    const organisations = enabled && projectId && fetched?.projectId === projectId ? fetched.data : EMPTY

    return {organisations, page, setPage, loading}
}
