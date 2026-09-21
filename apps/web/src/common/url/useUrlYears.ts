'use client'

import {lastNYears, maxFilterYear, MIN_FILTER_YEAR, type YearRange} from '@heritagemonitor/shared'
import {useCallback, useMemo} from 'react'
import {readYears, SEARCH_PARAM, yearsPatchValue} from './codecs'
import {useUrlState} from './useUrlState'

/**
 * The year range filter (`years=2019-2025`), plus the "last n years" presets.
 *
 * A preset is not stored as a preset: it is converted to the range it means
 * and written as that range, so a copied link keeps meaning the same years
 * tomorrow as it did today. `lastNYears` INCLUDES the current year (decision
 * in the plan), so "last 2 years" in 2026 is 2025-2026.
 */
export function useUrlYears() {
    const {params, update} = useUrlState()
    // Memoized: this is an OBJECT, and it ends up in the dependency list of
    // the chat context's useMemo. A fresh {from, to} every render would make
    // that memo recompute every render, which republishes the page context,
    // which re-renders — an unbounded loop.
    const years = useMemo(() => readYears(params), [params])

    const setYears = useCallback((range: YearRange | null) => update({[SEARCH_PARAM.years]: yearsPatchValue(range)}), [update])
    const setLastNYears = useCallback((n: number) => setYears(lastNYears(n)), [setYears])

    return {years, setYears, setLastNYears, minYear: MIN_FILTER_YEAR, maxYear: maxFilterYear()}
}
