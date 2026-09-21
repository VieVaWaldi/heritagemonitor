'use client'

import {useEffect, useState, useTransition} from 'react'
import {apiGet} from '@/common/api/apiClient'
import {useUrlDetailPage} from '@/common/url'

interface Parser<T> {
    parse(data: unknown): T
}

/**
 * The one hook behind every "list belonging to the open document" tab: a
 * project's organisations, an organisation's projects, a work's projects, a
 * minority group's organisations, topics, funders, projects and works.
 *
 * They are all the same thing — a paginated request keyed to the selected id,
 * whose page lives in the URL as `dpage` and is cleared when another row or
 * another tab is opened (see common/url's patchClearsDetailPage) — so they are
 * one hook rather than eight that drift apart. What differs is only the path,
 * which the caller builds.
 *
 * Nothing is fetched until the tab is actually open: some of these lists are
 * tens of thousands of rows behind a tab nobody clicked.
 */
export function useRelatedSearch<TResponse>({
    /** Identity of what the list belongs to — a change means a different list. */
    key,
    path,
    schema,
    empty,
    enabled,
}: {
    key: string | null
    path: (page: number) => string
    schema: Parser<TResponse>
    empty: TResponse
    enabled: boolean
}) {
    const {page, setPage} = useUrlDetailPage()
    // Tagged with the key it answers, so one document's list can never be
    // shown under another's name while a request is in flight. Paging WITHIN
    // one keeps the previous page visible instead of blanking.
    const [fetched, setFetched] = useState<{key: string; data: TResponse} | null>(null)
    const [loading, startTransition] = useTransition()

    useEffect(() => {
        if (!enabled || !key) return

        const controller = new AbortController()
        startTransition(async () => {
            try {
                setFetched({key, data: await apiGet(path(page), schema, {signal: controller.signal})})
            } catch {
                // Superseded by a newer request, or a transient failure: keep
                // what is on screen rather than flashing an empty list.
            }
        })

        return () => controller.abort()
        // `path` is rebuilt per render by design (it closes over the key and
        // any filters); `key` and `page` are what actually identify a request.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, page, enabled, schema])

    return {data: enabled && key && fetched?.key === key ? fetched.data : empty, page, setPage, loading}
}
