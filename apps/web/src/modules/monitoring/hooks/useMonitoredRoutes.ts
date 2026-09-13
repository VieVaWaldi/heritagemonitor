'use client'

import {useEffect, useState} from 'react'
import {getMonitoredRoutes} from '../api/getMonitoredRoutes'

const POLL_INTERVAL_MS = 30_000

export type MonitoredRoutes =
    {state: 'loading'} | {state: 'ok'; routes: string[]} | {state: 'error'; message: string}

// Polls rather than fetching once, so a route hit for the first time after
// the page loads (e.g. someone just exercised a new endpoint) shows up in
// the picker without a manual refresh.
export function useMonitoredRoutes(): MonitoredRoutes {
    const [state, setState] = useState<MonitoredRoutes>({state: 'loading'})

    useEffect(() => {
        let cancelled = false
        const controller = new AbortController()

        async function poll() {
            try {
                const {routes} = await getMonitoredRoutes(controller.signal)
                if (!cancelled) setState({state: 'ok', routes})
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
    }, [])

    return state
}
