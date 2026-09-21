'use client'

import {usePathname, useSearchParams} from 'next/navigation'
import {useEffect, useRef} from 'react'
import {recordStep} from './breadcrumbStore'
import {formatStep, newSessionId, stepQuery, type BreadcrumbStep} from './breadcrumbTrail'

const SESSION_KEY = 'hm.breadcrumbSession'

/**
 * The session id for this tab, minted once and kept in sessionStorage so a
 * reload continues the same visit while a new tab starts a new one.
 *
 * Wrapped in try/catch: sessionStorage throws in a private window with site
 * data blocked, and a breadcrumb is never worth breaking a page over.
 */
function sessionId(): string {
    try {
        const existing = window.sessionStorage.getItem(SESSION_KEY)
        if (existing) return existing
        const created = newSessionId()
        window.sessionStorage.setItem(SESSION_KEY, created)
        return created
    } catch {
        // No storage: still record, just as a one-off session.
        return newSessionId()
    }
}

/**
 * Records where the visitor has been and keeps the last few for Lucy.
 *
 * Driven by the pathname + search params rather than by hooking `update()`:
 * that way a link, a back button and an in-page state change are all seen the
 * same way, and there is exactly one place a step can come from. Consecutive
 * duplicates are dropped by `pushStep`, which is what keeps the debounced map
 * pan (a `replace` that rewrites the same page over and over) out of the trail.
 */
/**
 * Records every page this visitor opens.
 *
 * Mounted ONCE, in the root layout (see BreadcrumbRecorder) — not inside the
 * chat, which only exists while the panel is open and so would have recorded
 * nothing for anyone who never opened it.
 */
export function useRecordBreadcrumbs(): void {
    const pathname = usePathname()
    const params = useSearchParams()
    // Minus the map camera: a pan is a `replace` fired continuously, not a
    // step the visitor took. See stepQuery.
    const query = stepQuery(params.toString())

    // The last step we SENT, so a re-render never posts the same one twice.
    const lastSent = useRef<string | null>(null)

    useEffect(() => {
        const step: BreadcrumbStep = {path: pathname, query}
        const formatted = formatStep(step)
        if (lastSent.current === formatted) return
        lastSent.current = formatted

        recordStep(step)

        // `fetch` with `keepalive`, NOT navigator.sendBeacon.
        //
        // sendBeacon looks like the right tool and silently is not: it cannot
        // send a preflight, and `application/json` is not a CORS-safelisted
        // content type, so a cross-origin beacon (the api is a different
        // origin in dev) is dropped by the browser without an error anywhere.
        // `keepalive` gives the same survive-the-navigation guarantee for
        // small bodies while going through normal CORS.
        //
        // Failure is silent by design — a missing breadcrumb is not worth a
        // console error on a visitor's page.
        try {
            void fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/v1/breadcrumbs`, {
                method: 'POST',
                body: JSON.stringify({sessionId: sessionId(), path: pathname, query}),
                headers: {'Content-Type': 'application/json'},
                keepalive: true,
            }).catch(() => {})
        } catch {
            // No storage, no network: the page carries on.
        }
    }, [pathname, query])

}
