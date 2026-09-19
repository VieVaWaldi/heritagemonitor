'use client'

import type {RecentRequestEntry} from '@heritagemonitor/shared'
import {usePolledResource} from '@/common/hooks/usePolledResource'
import {getRecentRequests} from '../api/getRecentRequests'

const POLL_INTERVAL_MS = 2_000

export type RecentRequests =
    | {state: 'loading'}
    | {state: 'ok'; requests: RecentRequestEntry[]}
    | {state: 'error'; message: string}

export function useRecentRequests(): RecentRequests {
    const result = usePolledResource((signal) => getRecentRequests(signal), POLL_INTERVAL_MS, [])
    if (result.state === 'ok') return {state: 'ok', requests: result.data.requests}
    return result
}
