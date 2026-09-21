'use client'

import {useEffect, useState, useTransition} from 'react'
import type {EntityKey} from '@/common/catalog'
import {ApiError, apiGet} from '@/common/api/apiClient'
import {toApiSearchParams, useUrlState} from '@/common/url'

// The one search hook for every entity on /search*. It is generic because
// nothing in it is entity-specific: the URL already carries the whole request
// (see common/url), the api route is `/v1/<entity>/search`, and the response
// shape is the shared envelope. An entity contributes only its response
// schema — not a second copy of "how do I turn state into a query string".

interface Parser<T> {
    parse(data: unknown): T
}

export interface EntitySearchState<TResponse> {
    data: TResponse
    loading: boolean
    /** Set only for an error the user can act on (e.g. a page past the result window). */
    error: string | null
}

export function useEntitySearch<TResponse>(
    entity: EntityKey,
    /** Module-level constant, not built inline: it is part of the fetch's dependency list. */
    responseSchema: Parser<TResponse>,
    /** Shown until the first response arrives, and kept if a request fails. */
    initialData: TResponse,
): EntitySearchState<TResponse> {
    const {params} = useUrlState()
    // The page's own params minus the view-only ones, in a stable order — so
    // the same search never refetches just because the URL was written in a
    // different order.
    const queryString = toApiSearchParams(params)

    const [data, setData] = useState<TResponse>(initialData)
    const [error, setError] = useState<string | null>(null)
    // useTransition's flag is managed by React around the async callback, so
    // nothing here calls setState synchronously inside the effect body (see
    // https://react.dev/learn/you-might-not-need-an-effect).
    const [loading, startTransition] = useTransition()

    useEffect(() => {
        const controller = new AbortController()

        startTransition(async () => {
            try {
                const response = await apiGet(`/v1/${entity}/search?${queryString}`, responseSchema, {
                    signal: controller.signal,
                })
                setData(response)
                setError(null)
            } catch (caught) {
                // A 4xx is the api telling the user something about their own
                // request (the only one today: a page past the 10,000-result
                // window). Anything else is an abort — the request was
                // superseded — or a transient failure: keep the previous page
                // of results rather than flashing an empty list.
                if (caught instanceof ApiError && caught.status >= 400 && caught.status < 500) {
                    setError(caught.message)
                }
            }
        })

        return () => controller.abort()
    }, [entity, queryString, responseSchema])

    return {data, loading, error}
}
