'use client'

import type {HealthCheckResponse} from '@heritagemonitor/shared'
import {useEffect, useState} from 'react'
import {getHealthStatus} from '../api/getHealthStatus'

const POLL_INTERVAL_MS = 5000

export type HealthStatus =
    | { state: 'loading' }
    | { state: 'ok'; data: HealthCheckResponse; checkedAt: Date }
    | { state: 'error'; message: string; checkedAt: Date }

// Business logic (polling, error handling) lives here, not in HealthPage —
// per apps/web/RULES.md #7, UI components stay clean of domain logic.
export function useHealthStatus(): HealthStatus {
    const [status, setStatus] = useState<HealthStatus>({state: 'loading'})

    useEffect(() => {
        let cancelled = false
        const controller = new AbortController()

        async function poll() {
            try {
                const data = await getHealthStatus(controller.signal)
                if (!cancelled) setStatus({state: 'ok', data, checkedAt: new Date()})
            } catch (err) {
                if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) return
                const message = err instanceof Error ? err.message : 'Unknown error'
                setStatus({state: 'error', message, checkedAt: new Date()})
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

    return status
}
