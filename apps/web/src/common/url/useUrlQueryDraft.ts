'use client'

import {useCallback, useEffect, useState} from 'react'
import {SEARCH_PARAM, type UrlPatch} from './codecs'
import {useUrlState} from './useUrlState'

/** Long enough that a normal typing burst produces one URL write, short enough to feel live. */
const TYPING_DEBOUNCE_MS = 300

/**
 * The search box's text, mirrored into `?q=`.
 *
 * Two history policies in one hook, which is why it is a hook and not two
 * `update` calls at the call site:
 * - while TYPING, the text is written with `replace` after a pause, so a
 *   copied link always reproduces what is on screen without leaving one
 *   history entry per keystroke;
 * - on SUBMIT (Enter, the search button, picking a suggestion) it is written
 *   with `push`, so the back button walks through the queries the user
 *   actually meant.
 *
 * The draft is local state, not a read of the URL, because the URL lags
 * behind the keyboard by up to the debounce. `lastWritten` is what keeps the
 * two from fighting: a URL change is only mirrored back into the box when it
 * did NOT come from this hook (a permalink, back/forward, a link from
 * elsewhere) — otherwise a slow router update would overwrite characters the
 * user has already typed. It is state rather than a ref because the render
 * itself decides with it whether to accept the URL's value.
 */
export function useUrlQueryDraft(debounceMs = TYPING_DEBOUNCE_MS) {
    const {params, update} = useUrlState()
    const urlQuery = (params.get(SEARCH_PARAM.query) ?? '').trim()

    const [draft, setDraft] = useState(urlQuery)
    const [lastWritten, setLastWritten] = useState(urlQuery)

    // Adjusted during render rather than in an effect, per
    // https://react.dev/learn/you-might-not-need-an-effect — same pattern the
    // rest of this app uses for "state derived from a prop that can change".
    const [previousUrlQuery, setPreviousUrlQuery] = useState(urlQuery)
    if (urlQuery !== previousUrlQuery) {
        setPreviousUrlQuery(urlQuery)
        if (urlQuery !== lastWritten) {
            setLastWritten(urlQuery)
            setDraft(urlQuery)
        }
    }

    useEffect(() => {
        if (draft === lastWritten) return
        const timer = setTimeout(() => {
            setLastWritten(draft)
            update({[SEARCH_PARAM.query]: draft || null}, {history: 'replace'})
        }, debounceMs)
        return () => clearTimeout(timer)
    }, [draft, lastWritten, debounceMs, update])

    /**
     * `extraPatch` travels in the SAME update as the query, which matters for
     * the selection rules in useUrlState: picking a project from the
     * autocomplete sets `q` and `sel` together, and a patch that sets `sel`
     * itself keeps it instead of falling back to the first row.
     */
    const submit = useCallback(
        (value?: string, extraPatch?: UrlPatch) => {
            const submitted = (value ?? draft).trim()
            setDraft(submitted)
            setLastWritten(submitted)
            update({[SEARCH_PARAM.query]: submitted || null, ...extraPatch})
        },
        [draft, update],
    )

    return {draft, setDraft, submit}
}
