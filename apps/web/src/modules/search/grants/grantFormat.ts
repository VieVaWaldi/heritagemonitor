import {GRANT_FUNDING_CAVEAT, PSEUDO_GRANT_LABEL, grantTitle, type GrantDetail, type GrantRow} from '@heritagemonitor/shared'

// Presentation of funding-stream fields, in one place so a row, the overview
// tab and the chat context phrase the same number the same way.

export {GRANT_FUNDING_CAVEAT, PSEUDO_GRANT_LABEL, grantTitle}

/**
 * Always "approx.", and never without the caveat next to it: the amount is the
 * whole stream's, not its heritage share, and well over half the streams
 * report none at all.
 */
export function formatGrantFunding(amountEur: number | null): string {
    if (amountEur == null) return 'no amount reported'
    return `approx. ${Math.round(amountEur).toLocaleString('en-US')} EUR`
}

export function formatCount(count: number | null, singular: string, plural = `${singular}s`): string {
    const value = count ?? 0
    return `${value.toLocaleString('en-US')} ${value === 1 ? singular : plural}`
}

/** The funder as it should be shown: its name, falling back to the raw code. */
export function grantFunder(grant: GrantRow | GrantDetail): string | null {
    return grant.funder_name ?? grant.funder
}

/**
 * The share of a stream's projects that are cultural heritage, as a percentage
 * string — null when there is nothing to divide by.
 */
export function heritageShare(grant: GrantRow | GrantDetail): string | null {
    const total = grant.project_count ?? 0
    const dch = grant.dch_project_count ?? 0
    if (total <= 0 || dch <= 0) return null
    return `${Math.max(1, Math.round((dch / total) * 100))}% heritage`
}
