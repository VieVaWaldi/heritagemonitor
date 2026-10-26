'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import {mapViewPatchValue, readMapView, SEARCH_PARAM, type MapView} from './codecs'
import {useUrlState} from './useUrlState'

/**
 * How long the map must sit still before its camera is written to the URL.
 *
 * A pan fires a view-state change on every animation frame. Writing each one
 * would put hundreds of entries in the history and re-render the page at 60 Hz;
 * writing none would mean a copied link does not show what the sender saw.
 * Waiting for the gesture to end gives one write per movement.
 */
const COMMIT_DELAY_MS = 400

export interface UrlMapView {
    /** The camera a copied link asks for, or null to use the map's own default. */
    initialView: MapView | null
    /** Called on every view-state change; debounced internally. */
    onViewChange: (view: MapView) => void
}

/**
 * The map camera in the URL (`view=lat,lng,zoom`), debounced.
 *
 * `initialView` is read ONCE per mount, deliberately: deck.gl runs the camera
 * uncontrolled (see useDeckMapViewState), so feeding our own writes back in
 * would fight the user's gesture. The URL is an output during panning and an
 * input only when the page is opened or a link is followed.
 *
 * Always `replace`, never `push` — panning is continuous change, and one
 * history entry per drag would make the back button useless (see
 * useUrlState's UrlHistoryMode).
 */
export function useUrlMapView(): UrlMapView {
    const {params, update} = useUrlState()

    // Captured on the first render and then frozen: re-reading it would make
    // our own debounced write bounce back and reset the camera mid-pan.
    const [initialView] = useState(() => readMapView(params))

    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const latest = useRef<MapView | null>(null)

    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current)
    }, [])

    const onViewChange = useCallback(
        (view: MapView) => {
            latest.current = view
            if (timer.current) clearTimeout(timer.current)
            timer.current = setTimeout(() => {
                timer.current = null
                const pending = latest.current
                if (pending) update({[SEARCH_PARAM.view]: mapViewPatchValue(pending)}, {history: 'replace'})
            }, COMMIT_DELAY_MS)
        },
        [update],
    )

    return {initialView, onViewChange}
}
