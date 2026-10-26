'use client'

import {NoticeBar} from '@/common/components'

export interface SelectionDroppedNoticeProps {
    /** From useSelectedEntity — true for a few seconds after the fallback. */
    show: boolean
}

/**
 * Shown when the row that was open stopped matching the filters and the panel
 * fell back to the first result.
 *
 * Without it the detail panel silently becomes a different document, which
 * reads as a bug — the user changed a facet and something unrelated happened
 * to the thing they were reading. Same gold treatment as the deep-link notice,
 * because both explain why the page is not showing the plain search result.
 */
export function SelectionDroppedNotice({show}: SelectionDroppedNoticeProps) {
    if (!show) return null

    return (
        <NoticeBar tone="note">
            The item you had selected does not match the new filters, showing the first result instead.
        </NoticeBar>
    )
}
