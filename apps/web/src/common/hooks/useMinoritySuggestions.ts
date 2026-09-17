'use client'

import {useEffect, useState} from 'react'
import {minoritySuggestResponseSchema} from '@heritagemonitor/shared'
import {apiGet} from '@/common/api/apiClient'

const DEBOUNCE_MS = 200

/**
 * Debounced GET /v1/minorities/suggest, gated by `enabled` — shared between
 * the hero page's ActionBar and /search/minorities' own SearchNav, both of
 * which want the same typeahead behaviour when the Minorities UseCase is
 * selected. Only Minorities has a suggest endpoint today, so every other
 * UseCase passes `enabled: false` and gets `[]` until it has its own.
 */
export function useMinoritySuggestions(enabled: boolean, query: string): string[] {
    const [suggestions, setSuggestions] = useState<string[]>([])
    const trimmed = query.trim()
    // Derived, not reset via an effect (https://react.dev/learn/you-might-not-need-an-effect)
    // — `suggestions` itself can lag a render behind (e.g. still holding the
    // previous query's results while the new fetch is in flight), but
    // that's never surfaced since `active` gates the return value below.
    const active = enabled && trimmed.length > 0

    useEffect(() => {
        if (!active) return

        const controller = new AbortController()
        const timer = setTimeout(() => {
            apiGet(`/v1/minorities/suggest?q=${encodeURIComponent(trimmed)}`, minoritySuggestResponseSchema, {
                signal: controller.signal,
            })
                .then((response) => setSuggestions(response.suggestions))
                // A stale/aborted request or a transient network error just
                // leaves the previous suggestions in place — not worth
                // surfacing to the user for a typeahead dropdown.
                .catch(() => {})
        }, DEBOUNCE_MS)

        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [active, trimmed])

    return active ? suggestions : []
}
