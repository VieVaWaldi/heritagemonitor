'use client'

import {grantOrganisationsResponseSchema, type GrantOrganisationsResponse} from '@heritagemonitor/shared'
import {useEffect, useState, useTransition} from 'react'
import {apiGet} from '@/common/api/apiClient'

const EMPTY: GrantOrganisationsResponse = {organisations: [], complete: true}

/**
 * The organisations most involved in the selected stream's projects.
 *
 * One short list, not paginated: it is a "who does this money reach" answer,
 * and the tail of a big programme's thousands of participants is noise. The
 * api caps it, so there is no page to ask for.
 *
 * `complete: false` means the api's in-memory organisation table was still
 * loading and the names could not be resolved — a few seconds after a deploy,
 * and worth saying rather than showing an empty list as if there were none.
 */
export function useGrantOrganisations(grantId: string | null, corpus: string | undefined, enabled: boolean) {
    const [fetched, setFetched] = useState<{grantId: string; data: GrantOrganisationsResponse} | null>(null)
    const [loading, startTransition] = useTransition()

    useEffect(() => {
        if (!enabled || !grantId) return

        const controller = new AbortController()
        const search = corpus ? `?c=${encodeURIComponent(corpus)}` : ''

        startTransition(async () => {
            try {
                const data = await apiGet(
                    `/v1/grants/${encodeURIComponent(grantId)}/organisations${search}`,
                    grantOrganisationsResponseSchema,
                    {signal: controller.signal},
                )
                setFetched({grantId, data})
            } catch {
                // Superseded by a newer request, or a transient failure.
            }
        })

        return () => controller.abort()
    }, [grantId, corpus, enabled])

    const result = enabled && grantId && fetched?.grantId === grantId ? fetched.data : EMPTY

    return {organisations: result.organisations, complete: result.complete, loading}
}
