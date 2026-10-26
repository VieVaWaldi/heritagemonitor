'use client'

import type {BreadcrumbRow} from '@heritagemonitor/shared'
import {usePolledResource} from '@/common/hooks/usePolledResource'
import {getBreadcrumbs} from '../api/getBreadcrumbs'

// Slower than the live-request feed: breadcrumbs arrive at human speed, not at
// request speed, so a 2s poll would mostly re-fetch the same hundred rows.
const POLL_INTERVAL_MS = 10_000

export type BreadcrumbFeed =
    | {state: 'loading'}
    | {state: 'ok'; rows: BreadcrumbRow[]; retentionDays: number}
    | {state: 'error'; message: string}

export function useBreadcrumbFeed(): BreadcrumbFeed {
    const result = usePolledResource((signal) => getBreadcrumbs(signal), POLL_INTERVAL_MS, [])
    if (result.state === 'ok') return {state: 'ok', rows: result.data.rows, retentionDays: result.data.retentionDays}
    return result
}
