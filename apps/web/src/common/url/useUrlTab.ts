'use client'

import {useCallback} from 'react'
import {readOneOf, SEARCH_PARAM} from './codecs'
import {useUrlState} from './useUrlState'

/**
 * The active tab of the detail panel. In the URL because a link to "this
 * project's organisations" is a different thing to share than a link to its
 * overview — and because back should undo a tab switch like any other choice.
 *
 * `tabs` is the panel's own list of tab values; anything else in the URL
 * falls back to the first tab.
 */
export function useUrlTab<T extends string>(tabs: readonly T[]) {
    const {params, update} = useUrlState()
    const tab = readOneOf<T>(params, SEARCH_PARAM.tab, tabs, tabs[0])

    const setTab = useCallback((next: T) => update({[SEARCH_PARAM.tab]: next}), [update])

    return {tab, setTab}
}
