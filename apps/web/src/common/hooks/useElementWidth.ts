'use client'

import {useLayoutEffect, useRef, useState} from 'react'
import type {RefObject} from 'react'

/** Tracks the rendered (content) width in px of the element the returned ref
 * is attached to, via ResizeObserver. Undefined until the ref is attached
 * and the first observation fires.
 *
 * Useful to pin a sibling's max-width to this element's natural width when
 * CSS alone can't: a percentage width nested inside a shrink-to-fit ('fit-
 * content') ancestor is a cyclic reference, so browsers resolve it as
 * 'auto' when computing that ancestor's intrinsic size — letting long
 * unwrapped content (e.g. text) inflate the ancestor wider than intended. */
export function useElementWidth<T extends HTMLElement>(): [
    RefObject<T | null>,
    number | undefined,
] {
    const ref = useRef<T | null>(null)
    const [width, setWidth] = useState<number>()

    useLayoutEffect(() => {
        const el = ref.current
        if (!el) return

        const observer = new ResizeObserver(([entry]) => {
            setWidth(entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width)
        })
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    return [ref, width]
}
