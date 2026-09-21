'use client'

import {useCallback} from 'react'
import {readOptionalOneOf, SEARCH_PARAM} from './codecs'
import {useUrlState} from './useUrlState'

/**
 * The ranking of the current list. `null` means "no explicit choice" — the
 * api then picks the one that makes sense for the query (relevance with a
 * query text, the entity's own default without one), so the URL never has to
 * carry a sort the user did not pick.
 *
 * `options` is the entity's own list of valid values (e.g. PROJECT_SORT_OPTIONS
 * in @heritagemonitor/shared): a value outside it is ignored, not passed on to
 * the api to reject.
 */
export function useUrlSort<T extends string>(options: readonly T[]) {
    const {params, update} = useUrlState()
    const sort = readOptionalOneOf<T>(params, SEARCH_PARAM.sort, options)

    const setSort = useCallback((next: T | null) => update({[SEARCH_PARAM.sort]: next}), [update])

    return {sort, setSort}
}
