'use client'

import {
    workOrganisationsResponseSchema,
    workProjectsResponseSchema,
    type WorkOrganisationsResponse,
    type WorkProjectsResponse,
} from '@heritagemonitor/shared'
import {useEffect, useState, useTransition} from 'react'
import {apiGet} from '@/common/api/apiClient'
import {useUrlDetailPage} from '@/common/url'
import {relatedPaths} from '../entity/relatedPaths'

const EMPTY_PROJECTS: WorkProjectsResponse = {hits: [], estimatedTotalHits: 0, page: 1, pageCount: 1}
const EMPTY_ORGANISATIONS: WorkOrganisationsResponse = {hits: [], estimatedTotalHits: 0, page: 1, pageCount: 1}

/**
 * The projects or organisations behind the selected work, one page at a time.
 *
 * One hook for both tabs: they are the same request shape against the same
 * work, differing only in which id list the api resolves. The page lives in
 * the URL as `dpage` and is cleared when another work or another tab is opened
 * (see common/url's patchClearsDetailPage), and nothing is fetched until the
 * tab is actually open.
 */
export function useWorkProjects(workId: string | null, enabled: boolean) {
    const {page, setPage} = useUrlDetailPage()
    const [fetched, setFetched] = useState<{workId: string; data: WorkProjectsResponse} | null>(null)
    const [loading, startTransition] = useTransition()

    useEffect(() => {
        if (!enabled || !workId) return
        const controller = new AbortController()
        startTransition(async () => {
            try {
                const data = await apiGet(
                    relatedPaths.workProjects(workId, page),
                    workProjectsResponseSchema,
                    {signal: controller.signal},
                )
                setFetched({workId, data})
            } catch {
                // Superseded, or a transient failure: keep what is on screen.
            }
        })
        return () => controller.abort()
    }, [workId, page, enabled])

    return {
        projects: enabled && workId && fetched?.workId === workId ? fetched.data : EMPTY_PROJECTS,
        page,
        setPage,
        loading,
    }
}

export function useWorkOrganisations(workId: string | null, enabled: boolean) {
    const {page, setPage} = useUrlDetailPage()
    const [fetched, setFetched] = useState<{workId: string; data: WorkOrganisationsResponse} | null>(null)
    const [loading, startTransition] = useTransition()

    useEffect(() => {
        if (!enabled || !workId) return
        const controller = new AbortController()
        startTransition(async () => {
            try {
                const data = await apiGet(
                    relatedPaths.workOrganisations(workId, page),
                    workOrganisationsResponseSchema,
                    {signal: controller.signal},
                )
                setFetched({workId, data})
            } catch {
                // Superseded, or a transient failure.
            }
        })
        return () => controller.abort()
    }, [workId, page, enabled])

    return {
        organisations: enabled && workId && fetched?.workId === workId ? fetched.data : EMPTY_ORGANISATIONS,
        page,
        setPage,
        loading,
    }
}
