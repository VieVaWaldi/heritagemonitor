'use client'

import {QUERY_NETWORK_DEFAULT_MAX_EDGES, QUERY_NETWORK_HARD_MAX_EDGES, QUERY_NETWORK_MIN_EDGES} from '@heritagemonitor/shared'
import {useCallback, useEffect, useRef} from 'react'
import {readMaxEdges, SEARCH_PARAM} from './codecs'
import {useUrlState} from './useUrlState'

/** The slider reports every step of a drag; the URL (and so the request) only hears where it settled. */
const COMMIT_DELAY_MS = 400

/**
 * The query network's edge cap in the URL (`maxEdges`), debounced.
 *
 * `replace`, not `push`: tuning a slider is continuous change, and one history
 * entry per stop would make the back button useless. The default is not
 * written, so a plain link stays plain.
 */
export function useUrlMaxEdges() {
    const {params, update} = useUrlState()
    const maxEdges = readMaxEdges(params, {min: QUERY_NETWORK_MIN_EDGES, max: QUERY_NETWORK_HARD_MAX_EDGES, fallback: QUERY_NETWORK_DEFAULT_MAX_EDGES})

    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current)
    }, [])

    const setMaxEdges = useCallback(
        (next: number) => {
            if (timer.current) clearTimeout(timer.current)
            timer.current = setTimeout(
                () => update({[SEARCH_PARAM.maxEdges]: next === QUERY_NETWORK_DEFAULT_MAX_EDGES ? null : next}, {history: 'replace'}),
                COMMIT_DELAY_MS,
            )
        },
        [update],
    )

    return {maxEdges, setMaxEdges, min: QUERY_NETWORK_MIN_EDGES, max: QUERY_NETWORK_HARD_MAX_EDGES}
}
