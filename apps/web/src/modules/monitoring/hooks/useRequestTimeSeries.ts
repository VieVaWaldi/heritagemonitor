'use client'

import type {RequestTimeBucket, RequestTimeWindow} from '@heritagemonitor/shared'
import {usePolledResource} from '@/common/hooks/usePolledResource'
import {getRequestTimeSeries} from '../api/getRequestTimeSeries'

const POLL_INTERVAL_MS = 15_000

export type RequestTimeSeries =
    | {state: 'loading'}
    | {state: 'ok'; buckets: RequestTimeBucket[]}
    | {state: 'error'; message: string}

export function useRequestTimeSeries(
    route: string | null,
    window: RequestTimeWindow,
): RequestTimeSeries {
    const result = usePolledResource(
        (signal) => getRequestTimeSeries(route, window, signal),
        POLL_INTERVAL_MS,
        [route, window],
    )
    if (result.state === 'ok') return {state: 'ok', buckets: result.data.buckets}
    return result
}
