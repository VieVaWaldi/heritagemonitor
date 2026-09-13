'use client'

import {useEffect, useRef, useState} from 'react'

/** True for `durationMs` after `value` changes (never on mount), drives a
 * one-shot highlight animation when a controlled value changes elsewhere. */
export function useValueChangeFlash<T>(value: T, durationMs = 600): boolean {
    const [flashing, setFlashing] = useState(false)
    const isFirstRender = useRef(true)

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }
        setFlashing(true)
        const id = setTimeout(() => setFlashing(false), durationMs)
        return () => clearTimeout(id)
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only `value` should retrigger the flash, not a changing `durationMs`
    }, [value])

    return flashing
}
