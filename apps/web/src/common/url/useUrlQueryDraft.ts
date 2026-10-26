'use client'

import {useCallback, useEffect, useReducer, type CompositionEvent} from 'react'
import {SEARCH_PARAM, type UrlPatch} from './codecs'
import {initialQueryDraftState, queryDraftReducer, shouldEmit} from './queryDraft'
import {useUrlState} from './useUrlState'

/** Long enough that a normal typing burst is one URL write, short enough to feel live. */
const TYPING_DEBOUNCE_MS = 300

/**
 * The search box's text, mirrored into `?q=`.
 *
 * Two history policies in one hook, which is why it is a hook and not two
 * `update` calls at the call site:
 * - while TYPING, the text is written with `replace` after a pause, so a
 *   copied link reproduces what is on screen without leaving one history entry
 *   per keystroke;
 * - on SUBMIT (Enter, the search button, picking a suggestion) it is written
 *   with `push`, so the back button walks through the queries the user meant.
 *
 * THE TEXT IS NEVER NORMALISED HERE. Not trimmed, not rewritten, not
 * de-duplicated: the draft and the URL both hold exactly what was typed, and
 * every comparison is raw. Trimming the URL value on the way back in is what
 * used to delete the trailing space of `heritage AND `, which then glued the
 * next word on. `rewriteQuery`, the trim and the unbalanced-quote repair all
 * live where the OpenSearch query is built (packages/search's query lib),
 * which is the only place they belong.
 *
 * Which URL changes are this box's own echoes and which are somebody else's is
 * decided by the reducer in ./queryDraft — see its header for the race that
 * makes a single "last written" value insufficient.
 */
export function useUrlQueryDraft(debounceMs = TYPING_DEBOUNCE_MS) {
    const {params, update} = useUrlState()
    // Raw. `readText` trims, which is right for display and wrong for this.
    const urlQuery = params.get(SEARCH_PARAM.query) ?? ''

    const [state, dispatch] = useReducer(queryDraftReducer, urlQuery, initialQueryDraftState)

    // Every URL change is offered to the reducer, which decides whether it is
    // an echo to ignore or a real change to follow.
    useEffect(() => {
        dispatch({type: 'url', value: urlQuery, at: Date.now()})
    }, [urlQuery])

    useEffect(() => {
        if (!shouldEmit(state)) return
        const timer = setTimeout(() => {
            dispatch({type: 'emit', value: state.draft, at: Date.now()})
            update({[SEARCH_PARAM.query]: state.draft || null}, {history: 'replace'})
        }, debounceMs)
        return () => clearTimeout(timer)
    }, [state, debounceMs, update])

    const setDraft = useCallback((value: string) => dispatch({type: 'type', value}), [])

    /**
     * `extraPatch` travels in the SAME update as the query, which matters for
     * the selection rules in useUrlState: picking a project from the
     * autocomplete sets `q` and `sel` together, and a patch that sets `sel`
     * itself keeps it instead of falling back to the first row.
     */
    const submit = useCallback(
        (value?: string, extraPatch?: UrlPatch) => {
            const submitted = value ?? state.draft
            dispatch({type: 'submit', value: submitted, at: Date.now()})
            update({[SEARCH_PARAM.query]: submitted || null, ...extraPatch})
        },
        [state.draft, update],
    )

    // IME (Japanese, Chinese, accented input): half-composed text is neither
    // written to the URL nor overwritten by it.
    const onCompositionStart = useCallback(() => dispatch({type: 'compositionStart'}), [])
    const onCompositionEnd = useCallback((event: CompositionEvent<HTMLElement>) => {
        // The input's own value at the moment composition finished — the
        // committed text, not the half-composed one React last rendered.
        const target = event.target as HTMLInputElement
        dispatch({type: 'compositionEnd', value: target.value ?? ''})
    }, [])

    return {draft: state.draft, setDraft, submit, onCompositionStart, onCompositionEnd}
}
