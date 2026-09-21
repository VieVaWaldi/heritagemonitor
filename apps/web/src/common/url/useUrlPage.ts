'use client'

import {MAX_PAGE} from '@heritagemonitor/shared'
import {useCallback} from 'react'
import {readPage, SEARCH_PARAM} from './codecs'
import {useUrlState} from './useUrlState'

/**
 * The 1-based page of the current list, clamped to the deepest page the
 * result window allows (MAX_PAGE). Page 1 is written as no param at all, so
 * a first-page link stays clean and two URLs for the same page cannot exist.
 */
export function useUrlPage() {
    const {params, update} = useUrlState()
    const page = readPage(params, MAX_PAGE)

    const setPage = useCallback(
        (next: number) => update({[SEARCH_PARAM.page]: next > 1 ? next : null}),
        [update],
    )

    return {page, setPage}
}
