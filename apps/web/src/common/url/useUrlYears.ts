'use client'

import {maxFilterYear, MIN_FILTER_YEAR, type YearRange} from '@heritagemonitor/shared'
import {useCallback, useMemo} from 'react'
import {readYears, SEARCH_PARAM, yearsPatchValue} from './codecs'
import {useUrlState} from './useUrlState'

/**
 * The year range filter (`years=2019-2025`).
 *
 * Always an absolute range, never a relative one ("last 2 years"), so a
 * copied link still means the same years next January. The bounds come from
 * the shared contract, which is also what the api clamps to.
 */
export function useUrlYears() {
    const {params, update} = useUrlState()
    // Memoized: this is an OBJECT, and it ends up in the dependency list of
    // the chat context's useMemo. A fresh {from, to} every render would make
    // that memo recompute every render, which republishes the page context,
    // which re-renders — an unbounded loop.
    const years = useMemo(() => readYears(params), [params])

    const setYears = useCallback((range: YearRange | null) => update({[SEARCH_PARAM.years]: yearsPatchValue(range)}), [update])

    return {years, setYears, minYear: MIN_FILTER_YEAR, maxYear: maxFilterYear()}
}
