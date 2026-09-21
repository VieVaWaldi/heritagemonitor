'use client'

import {useCallback} from 'react'
import {readOneOf, SEARCH_PARAM} from './codecs'
import {useUrlState} from './useUrlState'

/**
 * Which visualization a page is showing (`layer=`), from the page's own list.
 * The first entry is the default and is not written to the URL.
 */
export function useUrlLayer<T extends string>(layers: readonly T[]) {
    const {params, update} = useUrlState()
    const layer = readOneOf<T>(params, SEARCH_PARAM.layer, layers, layers[0])

    const setLayer = useCallback((next: T) => update({[SEARCH_PARAM.layer]: next === layers[0] ? null : next}), [update, layers])

    return {layer, setLayer}
}
