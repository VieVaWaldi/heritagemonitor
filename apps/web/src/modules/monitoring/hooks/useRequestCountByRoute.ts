'use client'

import type {RequestTimeWindow, RouteRequestCount} from '@heritagemonitor/shared'
import {usePolledResource} from '@/common/hooks/usePolledResource'
import {getRequestCountByRoute} from '../api/getRequestCountByRoute'

const POLL_INTERVAL_MS = 15_000

export type RequestCountByRoute =
    | {state: 'loading'}
    | {state: 'ok'; counts: RouteRequestCount[]}
    | {state: 'error'; message: string}

export function useRequestCountByRoute(window: RequestTimeWindow): RequestCountByRoute {
    const result = usePolledResource(
        (signal) => getRequestCountByRoute(window, signal),
        POLL_INTERVAL_MS,
        [window],
    )
    if (result.state === 'ok') return {state: 'ok', counts: result.data.counts}
    return result
}
