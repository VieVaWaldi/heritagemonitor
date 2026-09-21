'use client'

import Button from '@mui/material/Button'
import {NoticeBar} from '@/common/components'

export interface DeepLinkNoticeProps {
    /** The ids the list is currently restricted to (`only=` in the URL). */
    onlyIds: string[]
    /** Singular noun for this entity, e.g. "organisation". */
    noun: string
    onClear: () => void
}

/**
 * Shown when the list is restricted to specific documents, because someone
 * arrived from another entity's row (see buildEntityLink). Without it the page
 * looks like a search that found exactly one result, which is a different —
 * and wrong — thing.
 *
 * "Clear" drops the restriction AND the selection, so the user lands where a
 * plain search would have put them: the full list with its first row open.
 * Keeping the linked-to row selected would leave the page in a state no
 * search could produce, with a detail panel pinned to something that may be
 * a hundred pages down.
 */
export function DeepLinkNotice({onlyIds, noun, onClear}: DeepLinkNoticeProps) {
    if (onlyIds.length === 0) return null

    return (
        <NoticeBar
            tone="note"
            action={
                <Button color="secondary" size="small" onClick={onClear}>
                    Clear
                </Button>
            }
        >
            Showing {onlyIds.length === 1 ? `1 ${noun}` : `${onlyIds.length} ${noun}s`} you linked to, not a full search.
        </NoticeBar>
    )
}
