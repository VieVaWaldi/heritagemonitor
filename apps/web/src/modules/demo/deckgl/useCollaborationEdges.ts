'use client'

import {useEffect, useState} from 'react'
import {collaborationEdgesResponseSchema, type CollaborationEdge} from '@heritagemonitor/shared'
import {apiGet} from '@/common/api/apiClient'

export type CollaborationEdgesState =
    | {state: 'loading'}
    | {state: 'ok'; edges: CollaborationEdge[]}
    | {state: 'error'; message: string}

// One-shot fetch, not polled (see modules/health's usePolledResource for
// that pattern) — this demo dataset is static seed data, nothing to refresh.
export function useCollaborationEdges(): CollaborationEdgesState {
    const [state, setState] = useState<CollaborationEdgesState>({state: 'loading'})

    useEffect(() => {
        const controller = new AbortController()

        apiGet('/v1/demo/collaboration-edges', collaborationEdgesResponseSchema, {signal: controller.signal})
            .then((response) => setState({state: 'ok', edges: response.edges}))
            .catch((err: unknown) => {
                if (err instanceof DOMException && err.name === 'AbortError') return
                setState({state: 'error', message: err instanceof Error ? err.message : 'Unknown error'})
            })

        return () => controller.abort()
    }, [])

    return state
}
