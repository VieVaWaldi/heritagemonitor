import {isValidElement, type ReactNode} from 'react'

// The pure part of NoticeBar's auto-dismiss, free of MUI and `@/` aliases so
// Node's test runner can exercise it (see test/noticeKey.test.ts).

/** How long a gold notice stays up before it dismisses itself. */
export const NOTICE_AUTO_DISMISS_MS = 5_000

/**
 * The visible text of a node, used to tell "the same notice" from "a notice
 * whose content changed" without asking every caller for a key.
 */
export function noticeTextOf(node: ReactNode): string {
    if (node === null || node === undefined || typeof node === 'boolean') return ''
    if (typeof node === 'string' || typeof node === 'number') return String(node)
    if (Array.isArray(node)) return node.map(noticeTextOf).join('')
    if (isValidElement<{children?: ReactNode}>(node)) return noticeTextOf(node.props.children)
    return ''
}


/** Identifies a notice by tone and visible text: same key = same notice. */
export function noticeKey(tone: string, children: ReactNode): string {
    return `${tone}|${noticeTextOf(children)}`
}
