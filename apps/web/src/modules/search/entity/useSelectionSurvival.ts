'use client'

import {useEffect, useState} from 'react'
import type {EntityKey} from '@/common/catalog'
import {apiGet} from '@/common/api/apiClient'
import {SEARCH_PARAM, toApiSearchParams, useUrlState} from '@/common/url'

// Does the row that is open still belong in the list?
//
// A facet change no longer clears the selection (see common/url's
// SELECTION_CLEARING_PARAMS): filtering is exactly when you want to keep your
// place. But a selection that no longer matches the filters would sit there
// contradicting the list beside it — "Region: Nordic" with a Spanish
// organisation open.
//
// So the panel asks one cheap question after each filter change: is this id
// still in the result set? That is a `size: 0` search with the page's own
// filters plus `only=<id>`, which the api already supports on every entity for
// deep links — no new endpoint, and the answer is a single total.

/** The verdict. `unknown` while the check is in flight — the caller keeps showing the row. */
export type SelectionSurvival = 'unknown' | 'matches' | 'dropped'

export interface SelectionSurvivalOptions {
    entity: EntityKey
    selectedId: string | null
    /**
     * Skips the check while true. The list already proves the row matches when
     * the row is on the current page, which is the common case and costs
     * nothing to notice.
     */
    visibleInList: boolean
}

/**
 * Verifies a kept selection against the current filters.
 *
 * Returns `dropped` only when the api positively says the id does not match —
 * never on a network error, because losing the open row over a transient
 * failure is worse than briefly showing one that no longer qualifies.
 */
export function useSelectionSurvival({entity, selectedId, visibleInList}: SelectionSurvivalOptions): SelectionSurvival {
    const {params} = useUrlState()

    // `only` is the id under test, so the page's own `only`/`sel` must not
    // also be in there; everything else (the filters) is exactly what decides.
    const probe = new URLSearchParams(toApiSearchParams(params))
    probe.delete(SEARCH_PARAM.only)
    probe.delete(SEARCH_PARAM.page)
    const filterKey = probe.toString()

    // Tagged with the question it answers, so the verdict is derived rather
    // than cleared and re-set, and a stale answer can never be read against a
    // newer set of filters.
    const [checked, setChecked] = useState<{key: string; survives: boolean} | null>(null)
    const key = selectedId ? `${entity}|${selectedId}|${filterKey}` : null

    useEffect(() => {
        if (!key || !selectedId || visibleInList) return

        const controller = new AbortController()
        const search = new URLSearchParams(filterKey)
        search.set(SEARCH_PARAM.only, selectedId)

        apiGet<{estimatedTotalHits: number}>(
            `/v1/${entity}/search?${search.toString()}`,
            {parse: (data) => data as {estimatedTotalHits: number}},
            {signal: controller.signal},
        )
            .then((response) => setChecked({key, survives: (response.estimatedTotalHits ?? 0) > 0}))
            // A failed probe is not evidence of anything — leave the row alone.
            .catch(() => {})

        return () => controller.abort()
    }, [key, entity, selectedId, filterKey, visibleInList])

    if (!selectedId) return 'unknown'
    // On the page already: the list itself is the proof.
    if (visibleInList) return 'matches'
    if (checked?.key !== key) return 'unknown'
    return checked.survives ? 'matches' : 'dropped'
}
