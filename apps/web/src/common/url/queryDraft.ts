// The search box's text, and the rule for when the URL is allowed to change it.
//
// TWO BUGS THIS EXISTS TO PREVENT, both of which ate the character you had
// just typed:
//
// 1. NORMALISATION. The box used to compare its draft against a TRIMMED read
//    of the URL. Type `heritage AND ` and the URL echo comes back as
//    `heritage AND`, which differs from the draft, looks like someone else
//    changed the query, and the trailing space is deleted — so the next word
//    is glued on ("ANDconservation"). That is why this only bit on the
//    Google-style syntax: plain words rarely end in a space, an operator
//    always does. The rule now: the draft and the URL both hold the RAW text,
//    every comparison is raw, and trimming / `rewriteQuery` / unbalanced-quote
//    repair happen ONLY where the OpenSearch query is built.
//
// 2. ECHO RACING. The box writes what you type into the URL after a debounce,
//    and that change comes back as a render. A single "last written" value
//    cannot tell an echo from a real change: by the time the echo for "ab"
//    arrives the box may already have written "abc", so "ab" looks external.
//    The box therefore keeps an ordered record of what it emitted and has not
//    yet seen come back.
//
// Pure and DOM-free, so the ordering rules are unit-tested rather than
// inferred from typing fast and hoping.

/**
 * How long after emitting a value its echo may still arrive. Within this
 * window an unexpected URL value that we recently emitted is a late echo;
 * after it, the same value is a deliberate navigation (back/forward to an
 * earlier query). Time is the only thing that tells those two apart — by
 * value they are identical — and a few hundred milliseconds is far longer
 * than a router round trip and far shorter than a human pressing Back.
 */
export const STALE_ECHO_WINDOW_MS = 2_000

interface EmittedValue {
    value: string
    at: number
}

export interface QueryDraftState {
    /** What the input shows. Raw: never trimmed, rewritten or de-duplicated. */
    draft: string
    /** Values written to the URL whose echo has not arrived yet, oldest first. */
    pending: EmittedValue[]
    /** Values whose echo HAS arrived, kept briefly in case a duplicate is still in flight. */
    recentlyEchoed: EmittedValue[]
    /** The last URL value reacted to, so an unchanged URL is not re-processed. */
    lastSeenUrl: string
    /**
     * True between compositionstart and compositionend (IME: Japanese,
     * Chinese, accented input). Half-composed text must neither be written to
     * the URL nor overwritten by it.
     */
    composing: boolean
}

export type QueryDraftEvent =
    | {type: 'type'; value: string}
    /** The debounce wrote this value to the URL. */
    | {type: 'emit'; value: string; at: number}
    /** The URL's `q` changed — our own echo, or someone else's doing. */
    | {type: 'url'; value: string; at: number}
    /** Enter, the search button, a picked suggestion: written immediately. */
    | {type: 'submit'; value: string; at: number}
    | {type: 'compositionStart'}
    | {type: 'compositionEnd'; value: string}

export function initialQueryDraftState(urlQuery: string): QueryDraftState {
    return {draft: urlQuery, pending: [], recentlyEchoed: [], lastSeenUrl: urlQuery, composing: false}
}

function prune(values: EmittedValue[], now: number): EmittedValue[] {
    return values.filter((entry) => now - entry.at < STALE_ECHO_WINDOW_MS)
}

export function queryDraftReducer(state: QueryDraftState, event: QueryDraftEvent): QueryDraftState {
    switch (event.type) {
        case 'type':
            return state.draft === event.value ? state : {...state, draft: event.value}

        case 'emit':
            // Recorded even when it repeats an earlier value: two identical
            // writes produce two echoes, and one must not consume the other.
            return {...state, pending: [...state.pending, {value: event.value, at: event.at}]}

        case 'submit':
            return {...state, draft: event.value, pending: [...state.pending, {value: event.value, at: event.at}]}

        case 'url': {
            if (event.value === state.lastSeenUrl) return {...state, lastSeenUrl: event.value}

            const echoIndex = state.pending.findIndex((entry) => entry.value === event.value)
            if (echoIndex >= 0) {
                // Our own value coming back. Everything emitted BEFORE it was
                // superseded, so those entries move to `recentlyEchoed` — their
                // echoes may still be in flight behind this one.
                const superseded = state.pending.slice(0, echoIndex + 1)
                return {
                    ...state,
                    pending: state.pending.slice(echoIndex + 1),
                    recentlyEchoed: prune([...state.recentlyEchoed, ...superseded], event.at),
                    lastSeenUrl: event.value,
                }
            }

            // Not pending — but if we emitted it moments ago, this is a late
            // or out-of-order echo arriving after a newer one was already
            // handled. Ignoring it is what keeps the newest character.
            const stale = state.recentlyEchoed.some((entry) => entry.value === event.value && event.at - entry.at < STALE_ECHO_WINDOW_MS)
            if (stale) return {...state, recentlyEchoed: prune(state.recentlyEchoed, event.at), lastSeenUrl: event.value}

            // A real external change: the reset button, back/forward, a pasted
            // URL, a suggestion picked elsewhere. The draft follows — unless an
            // IME composition is open, where replacing the text mid-word would
            // corrupt the input.
            if (state.composing) return {...state, lastSeenUrl: event.value}

            return {draft: event.value, pending: [], recentlyEchoed: [], lastSeenUrl: event.value, composing: false}
        }

        case 'compositionStart':
            return {...state, composing: true}

        case 'compositionEnd':
            return {...state, composing: false, draft: event.value}

        default:
            return state
    }
}

/** Whether the debounce should write `draft` to the URL right now. */
export function shouldEmit(state: QueryDraftState): boolean {
    if (state.composing) return false
    // Already on its way, or already there.
    const latest = state.pending[state.pending.length - 1]
    if (latest && latest.value === state.draft) return false
    return state.draft !== state.lastSeenUrl
}
