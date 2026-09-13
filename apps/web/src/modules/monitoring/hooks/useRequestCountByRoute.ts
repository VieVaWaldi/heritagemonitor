'use client'

import type {RequestTimeWindow, RouteRequestCount} from '@heritagemonitor/shared'
import {useEffect, useState} from 'react'
import {getRequestCountByRoute} from '../api/getRequestCountByRoute'

const POLL_INTERVAL_MS = 15_000

export type RequestCountByRoute =
    | {state: 'loading'}
    | {state: 'ok'; counts: RouteRequestCount[]}
    | {state: 'error'; message: string}

export function useRequestCountByRoute(window: RequestTimeWindow): RequestCountByRoute {
    const [state, setState] = useState<RequestCountByRoute>({state: 'loading'})

    useEffect(() => {
        let cancelled = false
        const controller = new AbortController()
        // eslint-disable-next-line react-hooks/set-state-in-effect -- resets to loading when `window` changes
        setState({state: 'loading'})

        async function poll() {
            try {
                const {counts} = await getRequestCountByRoute(window, controller.signal)
                if (!cancelled) setState({state: 'ok', counts})
            } catch (err) {
                if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) return
                const message = err instanceof Error ? err.message : 'Unknown error'
                setState({state: 'error', message})
            }
        }

        poll()
        const intervalId = setInterval(poll, POLL_INTERVAL_MS)

        return () => {
            cancelled = true
            controller.abort()
            clearInterval(intervalId)
        }
    }, [window])

    return state
}
