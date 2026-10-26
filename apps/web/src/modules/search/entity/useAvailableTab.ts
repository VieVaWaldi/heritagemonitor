'use client'

import {useEffect, useMemo} from 'react'
import {SEARCH_PARAM, useUrlState, useUrlTab} from '@/common/url'
import {availableTabs, resolveTab} from './tabAvailability'

/**
 * `useUrlTab` for a panel whose tabs depend on the selected document.
 *
 * Returns the tab that is actually showing and the tabs that exist. When the
 * URL names a tab that is hidden for this document (a shared link, or another
 * row was selected), the URL is corrected in place — `replace`, not a back
 * step — so nothing stale is left behind; setting a tab also clears the detail
 * panel's own page (`dpage`), as any tab change does (see common/url).
 */
export function useAvailableTab<T extends string>(all: readonly T[], hidden: readonly string[]) {
    const {tab: requested, setTab} = useUrlTab(all)
    const {update} = useUrlState()

    const hiddenKey = hidden.join('|')
    // `all` is a module-level constant; `hidden` is rebuilt per render, so it is keyed by content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const available = useMemo(() => availableTabs(all, hidden), [all, hiddenKey])
    const {tab, rewrite} = resolveTab(requested, available)

    useEffect(() => {
        if (rewrite) update({[SEARCH_PARAM.tab]: tab}, {history: 'replace'})
    }, [rewrite, tab, update])

    return {tab, setTab, available}
}
