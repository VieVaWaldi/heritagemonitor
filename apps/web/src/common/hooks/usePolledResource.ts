'use client'

import {useEffect, useState, type DependencyList} from 'react'

export type PolledResource<T> =
    | {state: 'loading'}
    | {state: 'ok'; data: T; checkedAt: Date}
    | {state: 'error'; message: string; checkedAt: Date}

/** Polls `fetcher` every `intervalMs`, restarting whenever `deps` change.
 * Guards against setting state after unmount/dep-change via a cancelled
 * flag plus AbortController, and treats an aborted fetch as a no-op rather
 * than an error. */
export function usePolledResource<T>(
    fetcher: (signal: AbortSignal) => Promise<T>,
    intervalMs: number,
    deps: DependencyList,
): PolledResource<T> {
    const [state, setState] = useState<PolledResource<T>>({state: 'loading'})

    useEffect(() => {
        let cancelled = false
        const controller = new AbortController()
        // eslint-disable-next-line react-hooks/set-state-in-effect -- resets to loading when deps change
        setState({state: 'loading'})

        async function poll() {
            try {
                const data = await fetcher(controller.signal)
                if (!cancelled) setState({state: 'ok', data, checkedAt: new Date()})
            } catch (err) {
                if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) return
                const message = err instanceof Error ? err.message : 'Unknown error'
                setState({state: 'error', message, checkedAt: new Date()})
            }
        }

        poll()
        const intervalId = setInterval(poll, intervalMs)

        return () => {
            cancelled = true
            controller.abort()
            clearInterval(intervalId)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- deps is the caller's own dependency list
    }, deps)

    return state
}
