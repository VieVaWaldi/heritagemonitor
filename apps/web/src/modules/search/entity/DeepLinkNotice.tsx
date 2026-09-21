'use client'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'

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
 * and wrong — thing. "Clear" drops `only` and leaves everything else, so the
 * user lands in the full list with the same document still open.
 */
export function DeepLinkNotice({onlyIds, noun, onClear}: DeepLinkNoticeProps) {
    if (onlyIds.length === 0) return null

    return (
        <Alert
            severity="info"
            action={
                <Button color="inherit" size="small" onClick={onClear}>
                    Clear
                </Button>
            }
        >
            Showing {onlyIds.length === 1 ? `1 ${noun}` : `${onlyIds.length} ${noun}s`} you linked to, not a full search.
        </Alert>
    )
}
