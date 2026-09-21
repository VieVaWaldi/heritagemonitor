'use client'

import {useCallback, useRef, useState} from 'react'
import {FlyToInterpolator} from '@deck.gl/core'
import type {PartialViewState, ViewState} from './types'

// Ported from digicher_webinterface's MapController.tsx — the view-state
// control logic (reset/zoom/geolocate, plus the controlled/uncontrolled
// hybrid below) is generic to any embedded deck.gl map, not specific to any
// one dataset, so it lives here rather than in a demo/search page.

const DEFAULT_CAMERA = {
    bearing: 0,
    pitch: 0,
    padding: {top: 0, bottom: 0, left: 0, right: 0},
}

const ZOOM_STEP_DURATION_MS = 300
const RESET_DURATION_MS = 1000
const GEOLOCATE_DURATION_MS = 1500
const MIN_ZOOM = 0
const MAX_ZOOM = 20

export type CommandedViewState = ViewState & {
    transitionDuration?: number
    transitionInterpolator?: FlyToInterpolator
}

export interface DeckMapViewState {
    /** Merged defaultViewState — pass as deck.gl's `initialViewState` (uncontrolled mode) */
    initialViewState: ViewState
    /** Only set for programmatic fly-to commands (reset/zoom/geolocate) — see DeckMapCanvas */
    commandedViewState: CommandedViewState | undefined
    onViewStateChange: (viewState: ViewState) => void
    reset: () => void
    zoomBy: (delta: number) => void
    geolocate: () => void
    /** Fly to a place, keeping tilt and bearing — e.g. the new centre of a network. */
    flyTo: (target: {latitude: number; longitude: number; zoom?: number}) => void
    isGlobe: boolean
    toggleGlobe: () => void
}

export function useDeckMapViewState(defaultViewState: PartialViewState): DeckMapViewState {
    const initialViewState: ViewState = {...DEFAULT_CAMERA, ...defaultViewState}

    // Tracks the live view state without causing a re-render on every pan/
    // zoom frame — only commandedViewState (a deliberate fly-to) needs to
    // trigger one. Reading commandedViewState back in also puts deck.gl into
    // controlled mode, which the next user interaction would revert,
    // forcing a full layer reinitialization — see the useState comment below.
    const viewStateRef = useRef<ViewState>(initialViewState)

    // Never initialize this with the starting position — that would put
    // deck.gl into controlled mode from mount, and the first user scroll
    // would switch it back to uncontrolled, reinitializing every layer.
    const [commandedViewState, setCommandedViewState] = useState<CommandedViewState | undefined>(undefined)

    const [isGlobe, setIsGlobe] = useState(false)

    const onViewStateChange = useCallback(
        (newViewState: ViewState) => {
            viewStateRef.current = newViewState
            if (commandedViewState) setCommandedViewState(undefined)
        },
        [commandedViewState],
    )

    const reset = useCallback(() => {
        setCommandedViewState({
            ...initialViewState,
            transitionDuration: RESET_DURATION_MS,
            transitionInterpolator: new FlyToInterpolator(),
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps -- initialViewState is derived fresh each render from the same defaultViewState prop
    }, [])

    const zoomBy = useCallback((delta: number) => {
        const current = viewStateRef.current
        setCommandedViewState({
            ...current,
            zoom: Math.min(Math.max(current.zoom + delta, MIN_ZOOM), MAX_ZOOM),
            transitionDuration: ZOOM_STEP_DURATION_MS,
            transitionInterpolator: new FlyToInterpolator(),
        })
    }, [])

    const geolocate = useCallback(() => {
        navigator.geolocation.getCurrentPosition((position) => {
            setCommandedViewState({
                ...viewStateRef.current,
                longitude: position.coords.longitude,
                latitude: position.coords.latitude,
                pitch: 45,
                bearing: -20,
                zoom: 15.5,
                transitionDuration: GEOLOCATE_DURATION_MS,
                transitionInterpolator: new FlyToInterpolator(),
            })
        })
    }, [])

    const flyTo = useCallback((target: {latitude: number; longitude: number; zoom?: number}) => {
        const current = viewStateRef.current
        setCommandedViewState({
            ...current,
            ...target,
            zoom: target.zoom ?? current.zoom,
            transitionDuration: RESET_DURATION_MS,
            transitionInterpolator: new FlyToInterpolator(),
        })
    }, [])

    const toggleGlobe = useCallback(() => setIsGlobe((prev) => !prev), [])

    return {initialViewState, commandedViewState, onViewStateChange, reset, zoomBy, geolocate, flyTo, isGlobe, toggleGlobe}
}
