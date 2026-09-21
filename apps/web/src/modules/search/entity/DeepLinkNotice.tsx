'use client'

import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CloseIcon from '@mui/icons-material/Close'
import {useState} from 'react'
import {NoticeBar} from '@/common/components'

export interface DeepLinkNoticeProps {
    /** The ids the list is currently restricted to (`only=` in the URL). */
    onlyIds: string[]
    /** Singular noun for this entity, e.g. "organisation". */
    noun: string
    onClear: () => void
    /**
     * Names of the restricted documents (the rows on screen), for the chip that
     * outlives the notice. Falls back to a count when not given.
     */
    names?: string[]
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
export function DeepLinkNotice({onlyIds, noun, onClear, names}: DeepLinkNoticeProps) {
    // The notice dismisses itself (see NoticeBar) but the restriction does not
    // go away with it. Once it has, a small chip keeps saying what the list is
    // restricted to and lets the user lift it. Tagged with the restriction it
    // was dismissed for, so a different `only` shows its notice again.
    const restriction = onlyIds.join(',')
    const [dismissedFor, setDismissedFor] = useState<string | null>(null)

    if (onlyIds.length === 0) return null

    if (dismissedFor === restriction) {
        const label =
            names && names.length > 0 && names.length <= 3
                ? names.join(', ')
                : onlyIds.length === 1
                  ? `1 ${noun}`
                  : `${onlyIds.length} ${noun}s`
        return (
            <Chip
                label={`Only: ${label}`}
                onDelete={onClear}
                deleteIcon={<CloseIcon aria-label="Show the full list" />}
                size="small"
                color="secondary"
                variant="outlined"
                sx={{alignSelf: 'flex-start', maxWidth: '100%'}}
            />
        )
    }

    return (
        <NoticeBar
            tone="note"
            onDismiss={() => setDismissedFor(restriction)}
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
