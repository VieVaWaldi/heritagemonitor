'use client'

import {useEffect, useState, useTransition} from 'react'
import type {EntityKey} from '@/common/catalog'
import {apiGet} from '@/common/api/apiClient'
import {useUrlSelection} from '@/common/url'
import {isSelectionNoticeVisible, resolveSelection, SELECTION_NOTICE_MS, selectionUrlCorrection} from './selectionFallback'
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
    /**
     * True for a few seconds after the open row stopped matching the filters
     * and the panel fell back to the first result. The panel shows a notice —
     * otherwise the detail silently becomes a different document.
     */
    selectionDropped: boolean
}

export function useSelectedEntity<TDetail>(
    entity: EntityKey,
    /** Module-level constant: it is part of the fetch's dependency list. */
    detailSchema: Parser<TDetail>,
    /** Ids of the rows currently listed — the first one is the default selection. */
    rowIds: string[],
): SelectedEntityState<TDetail> {
    const {selectedId: requestedId, select, clearSelection} = useUrlSelection(rowIds[0] ?? null)

    // A facet change keeps the open row (see common/url's
    // SELECTION_CLEARING_PARAMS). This is the other half of that rule: if the
    // kept row no longer matches the filters, fall back to the first row that
    // does, so the panel can never contradict the list beside it.
    const survival = useSelectionSurvival({
        entity,
        selectedId: requestedId,
        visibleInList: requestedId !== null && rowIds.includes(requestedId),
    })
    const {selectedId, dropped} = resolveSelection(requestedId, rowIds[0] ?? null, survival)

    // THE URL HAS TO FOLLOW. Falling back only in local state left `sel=<old
    // id>` in the address bar while the panel showed a different document —
    // so a copied link reopened the old one and the page contradicted itself.
    // See selectionUrlCorrection for what is written and why.
    const [droppedAt, setDroppedAt] = useState(0)
    useEffect(() => {
        const correction = selectionUrlCorrection(dropped)
        if (!correction) return
        clearSelection({history: correction.history})
        // Raised from a timeout, not synchronously (no cascading render). Not
        // cancelled on cleanup: the correction flips `dropped` back to false as
        // soon as the URL lands, and cancelling then would swallow the notice.
        setTimeout(() => setDroppedAt(Date.now()), 0)
    }, [dropped, clearSelection])

    // Auto-dismiss, also from a timeout callback.
    const [now, setNow] = useState(0)
    useEffect(() => {
        if (droppedAt === 0) return
        const timer = setTimeout(() => setNow(Date.now()), SELECTION_NOTICE_MS)
        return () => clearTimeout(timer)
    }, [droppedAt])
    const selectionDropped = isSelectionNoticeVisible(droppedAt, now)
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
        selectionDropped,
    }
}
