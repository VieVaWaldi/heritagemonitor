'use client'

import {useCallback, useMemo} from 'react'
import {readList} from './codecs'
import {useUrlState} from './useUrlState'

export type UrlFilterValues<TParam extends string> = Readonly<Record<TParam, string[]>>

/**
 * The checkbox-style filters of a page: one repeated URL param per filter,
 * read and written as a group.
 *
 * `params` is the entity's own list of filter param names (for projects it
 * comes from PROJECT_FACET_FIELDS, so the api's aggregations, the URL and the
 * UI can never drift apart). Values are NOT validated against a vocabulary —
 * which funder codes exist is the api's business, and a shared link must keep
 * working when a new one appears.
 *
 * Every change is a `push` and resets the page (useUrlState does that), which
 * is what makes the back button walk back through the filters the user tried.
 */
export function useUrlFilters<TParam extends string>(params: readonly TParam[]) {
    const {params: searchParams, update} = useUrlState()

    // `params` is expected to be a module-level constant (every call site
    // derives it from a shared config), so depending on its identity is both
    // correct and stable.
    const values = useMemo(
        () => Object.fromEntries(params.map((name) => [name, readList(searchParams, name)])) as UrlFilterValues<TParam>,
        [searchParams, params],
    )

    const setFilter = useCallback(
        (name: TParam, next: string[]) => update({[name]: next.length > 0 ? next : null}),
        [update],
    )

    const activeCount = useMemo(() => params.reduce((sum, name) => sum + values[name].length, 0), [params, values])

    return {values, setFilter, activeCount}
}
