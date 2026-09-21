'use client'

import {MAX_PAGE} from '@heritagemonitor/shared'
import {useCallback} from 'react'
import {readPage, SEARCH_PARAM} from './codecs'
import {useUrlState} from './useUrlState'

/**
 * The page of the list INSIDE the detail panel — a project's organisations
 * tab, later a minority's subgroups. Its own param (`dpage`), separate from
 * the results list's `page`, and dropped automatically when another row or
 * another tab is opened (see patchClearsDetailPage).
 */
export function useUrlDetailPage() {
    const {params, update} = useUrlState()
    const page = readPage(params, MAX_PAGE, SEARCH_PARAM.detailPage)

    const setPage = useCallback(
        (next: number) => update({[SEARCH_PARAM.detailPage]: next > 1 ? next : null}),
        [update],
    )

    return {page, setPage}
}
