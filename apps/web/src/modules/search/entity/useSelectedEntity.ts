'use client'

import {useEffect, useState, useTransition} from 'react'
import type {EntityKey} from '@/common/catalog'
import {apiGet} from '@/common/api/apiClient'
import {useUrlSelection} from '@/common/url'
import {useSelectionSurvival} from './useSelectionSurvival'

// The detail half of every entity panel: which row is open (from the URL) and
// the document behind it. Generic for the same reason useEntitySearch is —
// the route is `/v1/<entity>/<id>` for all of them, and only the response
// schema differs.

interface Parser<T> {
    parse(data: unknown): T
}

export interface SelectedEntityState<TDetail> {
    selectedId: string | null
    detail: TDetail | null
    loading: boolean
    select: (id: string) => void
}

export function useSelectedEntity<TDetail>(
    entity: EntityKey,
    /** Module-level constant: it is part of the fetch's dependency list. */
    detailSchema: Parser<TDetail>,
    /** Ids of the rows currently listed — the first one is the default selection. */
    rowIds: string[],
): SelectedEntityState<TDetail> {
    const {selectedId: requestedId, select} = useUrlSelection(rowIds[0] ?? null)

    // A facet change keeps the open row (see common/url's
    // SELECTION_CLEARING_PARAMS). This is the other half of that rule: if the
    // kept row no longer matches the filters, fall back to the first row that
    // does, so the panel can never contradict the list beside it.
    const survival = useSelectionSurvival({
        entity,
        selectedId: requestedId,
        visibleInList: requestedId !== null && rowIds.includes(requestedId),
    })
    const selectedId = survival === 'dropped' ? (rowIds[0] ?? null) : requestedId
    // Stored with the id it belongs to, so "the detail of the row that is
    // open right now" is derived below rather than cleared and re-set: no
    // state write is needed for the "nothing selected" case, and the panel
    // never shows the previous row's fields under the new row's name.
    const [fetched, setFetched] = useState<{id: string; detail: TDetail} | null>(null)
    // useTransition rather than a hand-managed flag, so nothing calls setState
    // synchronously inside the effect body — same pattern as useEntitySearch.
    const [loading, startTransition] = useTransition()

    useEffect(() => {
        if (!selectedId) return

        const controller = new AbortController()
        startTransition(async () => {
            try {
                const detail = await apiGet(`/v1/${entity}/${encodeURIComponent(selectedId)}`, detailSchema, {
                    signal: controller.signal,
                })
                setFetched({id: selectedId, detail})
            } catch {
                // An abort means a newer selection already won, so the stale
                // entry is discarded by the id check below either way; a real
                // failure (the id no longer exists) leaves the panel empty.
            }
        })

        return () => controller.abort()
    }, [entity, selectedId, detailSchema])

    return {
        selectedId,
        detail: selectedId !== null && fetched?.id === selectedId ? fetched.detail : null,
        loading,
        select,
    }
}
