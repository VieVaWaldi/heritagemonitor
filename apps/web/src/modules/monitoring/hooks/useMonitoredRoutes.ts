'use client'

import {usePolledResource} from '@/common/hooks/usePolledResource'
import {getMonitoredRoutes} from '../api/getMonitoredRoutes'

const POLL_INTERVAL_MS = 30_000

export type MonitoredRoutes =
    {state: 'loading'} | {state: 'ok'; routes: string[]} | {state: 'error'; message: string}

// Polls rather than fetching once, so a route hit for the first time after
// the page loads (e.g. someone just exercised a new endpoint) shows up in
// the picker without a manual refresh.
export function useMonitoredRoutes(): MonitoredRoutes {
    const result = usePolledResource(getMonitoredRoutes, POLL_INTERVAL_MS, [])
    if (result.state === 'ok') return {state: 'ok', routes: result.data.routes}
    return result
}
