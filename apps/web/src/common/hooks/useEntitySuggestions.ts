'use client'

import {entitySuggestResponseSchema, type EntitySuggestion} from '@heritagemonitor/shared'
import {useEffect, useState} from 'react'
import {apiGet} from '@/common/api/apiClient'
import type {EntityKey} from '@/common/catalog'

const DEBOUNCE_MS = 200

/**
 * Which entities answer `GET /v1/<entity>/suggest`. An entity missing from
 * this list gets no dropdown at all rather than a failing request — works has
 * no type-ahead by design (50M rows, no `search_as_you_type` field), and the
 * rest arrive with their own slices.
 */
const ENTITIES_WITH_SUGGEST: ReadonlySet<EntityKey> = new Set<EntityKey>(['projects', 'minorities'])

export function entityHasSuggestions(entity: EntityKey): boolean {
    return ENTITIES_WITH_SUGGEST.has(entity)
}

/**
 * Debounced type-ahead for whichever entity the search bar is pointed at —
 * the hero page's ActionBar and every /search route's own SearchNav use this
 * one hook. Generic because the route (`/v1/<entity>/suggest`) and the
 * response (the shared suggestion shape) are the same for all of them; only
 * the entity differs.
 */
export function useEntitySuggestions(entity: EntityKey, query: string): EntitySuggestion[] {
    const [suggestions, setSuggestions] = useState<EntitySuggestion[]>([])
    const trimmed = query.trim()
    // Derived, not reset via an effect (https://react.dev/learn/you-might-not-need-an-effect)
    // — `suggestions` itself can lag a render behind (e.g. still holding the
    // previous query's results while the new fetch is in flight), but that is
    // never surfaced since `active` gates the return value below.
    const active = entityHasSuggestions(entity) && trimmed.length > 0

    useEffect(() => {
        if (!active) return

        const controller = new AbortController()
        const timer = setTimeout(() => {
            apiGet(`/v1/${entity}/suggest?q=${encodeURIComponent(trimmed)}`, entitySuggestResponseSchema, {
                signal: controller.signal,
            })
                .then((response) => setSuggestions(response.suggestions))
                // A stale/aborted request or a transient network error just
                // leaves the previous suggestions in place — not worth
                // surfacing to the user for a type-ahead dropdown.
                .catch(() => {})
        }, DEBOUNCE_MS)

        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [active, entity, trimmed])

    return active ? suggestions : []
}
