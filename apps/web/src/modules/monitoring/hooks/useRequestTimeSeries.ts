'use client'

import type {RequestTimeBucket, RequestTimeWindow} from '@heritagemonitor/shared'
import {useEffect, useState} from 'react'
import {getRequestTimeSeries} from '../api/getRequestTimeSeries'

const POLL_INTERVAL_MS = 15_000

export type RequestTimeSeries =
    | { state: 'loading' }
    | { state: 'ok'; buckets: RequestTimeBucket[] }
    | { state: 'error'; message: string }

export function useRequestTimeSeries(route: string | null, window: RequestTimeWindow): RequestTimeSeries {
    const [state, setState] = useState<RequestTimeSeries>({state: 'loading'})

    useEffect(() => {
        let cancelled = false
        const controller = new AbortController()
        setState({state: 'loading'})

        async function poll() {
            try {
                const {buckets} = await getRequestTimeSeries(route, window, controller.signal)
                if (!cancelled) setState({state: 'ok', buckets})
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
    }, [route, window])

    return state
}
