'use client'

import type {HealthCheckResponse} from '@heritagemonitor/shared'
import {usePolledResource, type PolledResource} from '@/common/hooks/usePolledResource'
import {getHealthStatus} from '../api/getHealthStatus'

const POLL_INTERVAL_MS = 5000

export type HealthStatus = PolledResource<HealthCheckResponse>

// Business logic (polling, error handling) lives here, not in HealthPage —
// per apps/web/RULES.md #7, UI components stay clean of domain logic.
export function useHealthStatus(): HealthStatus {
    return usePolledResource(getHealthStatus, POLL_INTERVAL_MS, [])
}
