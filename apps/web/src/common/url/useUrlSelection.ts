'use client'

import {useCallback} from 'react'
import {readId, SEARCH_PARAM} from './codecs'
import {useUrlState} from './useUrlState'

/**
 * Which row's detail panel is open.
 *
 * With no `sel` in the URL the first row of the current page is selected,
 * derived rather than written: opening a search should not push a history
 * entry for a choice the user never made. As soon as a row IS clicked the id
 * goes into the URL with a `push`, so back returns to the previously open
 * row and a copied link opens the same one.
 *
 * An explicit `sel` always wins, even when that id is not on the current page
 * — that is what makes a deep link (`?only=<id>&sel=<id>`) from another
 * entity's row work.
 *
 * Ids stay strings: a project id like 13508218431153968733 is past
 * Number.MAX_SAFE_INTEGER.
 */
export function useUrlSelection(fallbackId: string | null) {
    const {params, update} = useUrlState()
    const selectedId = readId(params, SEARCH_PARAM.selection) ?? fallbackId

    const select = useCallback((id: string) => update({[SEARCH_PARAM.selection]: id}), [update])
    const clearSelection = useCallback(() => update({[SEARCH_PARAM.selection]: null}), [update])

    return {selectedId, select, clearSelection}
}
