'use client'

import {usePathname, useRouter, useSearchParams} from 'next/navigation'
import {useCallback, useMemo} from 'react'
import {applyPatch, patchInvalidatesPage, SEARCH_PARAM, type UrlPatch} from './codecs'

/**
 * How an update affects the browser's history.
 *
 * - `push` for a discrete choice the user made and might want to undo: a
 *   filter, a sort, a page, the corpus, a selected row, a tab, a submitted
 *   query. Back then restores the previous one, which is the whole point of
 *   keeping this state in the URL.
 * - `replace` for continuous change: typing before submit, a slider being
 *   dragged, a map being panned. One history entry per keystroke would make
 *   the back button useless.
 */
export type UrlHistoryMode = 'push' | 'replace'

export interface UrlUpdateOptions {
    history?: UrlHistoryMode
}

// Two updates can be dispatched before React re-renders (a row click that
// also switches tab; two components reacting to the same event). Both would
// read the same `useSearchParams()` value, so the second would silently drop
// the first. This buffer holds what was last written so the second merges
// onto it instead.
//
// It is module-level rather than a ref because the two updates can come from
// two different components, which would each have their own ref. It is only
// ever read and written inside `update` — an event handler, never during
// render — and it counts as usable only while the URL it was built from is
// still the current one, so our own write landing or a back/forward retires
// it by itself, with no cleanup to get wrong.
let pendingWrite: {pathname: string; basedOn: string; params: URLSearchParams} | null = null

export interface UrlState {
    /** The current params. Read through the codecs in ./codecs, not with bare `.get()` calls. */
    params: URLSearchParams
    /**
     * Merges `patch` into the current URL and navigates. Params the patch
     * does not mention are kept (unknown ones included), and `page` is reset
     * whenever the patch changes which results match.
     */
    update: (patch: UrlPatch, options?: UrlUpdateOptions) => void
}

export function useUrlState(): UrlState {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const current = searchParams.toString()

    const update = useCallback(
        (patch: UrlPatch, {history = 'push'}: UrlUpdateOptions = {}) => {
            const pending = pendingWrite
            const usable = pending !== null && pending.pathname === pathname && pending.basedOn === current
            const base = usable ? pending.params : new URLSearchParams(current)
            const effective = patchInvalidatesPage(patch) ? {...patch, [SEARCH_PARAM.page]: null} : patch
            const next = applyPatch(base, effective)

            pendingWrite = {pathname, basedOn: current, params: next}

            const queryString = next.toString()
            const url = queryString ? `${pathname}?${queryString}` : pathname
            // scroll: false — these are in-page state changes (a page of
            // results, a selected row), not navigations to a new document.
            if (history === 'replace') router.replace(url, {scroll: false})
            else router.push(url, {scroll: false})
        },
        [router, pathname, current],
    )

    // A plain (mutable) URLSearchParams rather than Next's readonly wrapper,
    // memoized so consumers can depend on its identity.
    const params = useMemo(() => new URLSearchParams(current), [current])

    return {params, update}
}
