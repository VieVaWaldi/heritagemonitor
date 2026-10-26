import {FUNDING_AMOUNT_CAVEAT, formatGeolocatedShare, type FundingOrganisation} from '@heritagemonitor/shared'

export {FUNDING_AMOUNT_CAVEAT, formatGeolocatedShare}

/**
 * Money on this page is always "approx.": a project's budget is split equally
 * across its organisations (D13) and only ~58% of projects report one at all.
 * Rendered next to FUNDING_AMOUNT_CAVEAT wherever it is not obvious.
 */
export function formatFundingEur(amountEur: number): string {
    return `approx. ${Math.round(amountEur).toLocaleString('en-US')} EUR`
}

/** Compact form for a row, where the full number would not fit. */
export function formatCompactEur(amountEur: number): string {
    return new Intl.NumberFormat('en', {
        style: 'currency',
        currency: 'EUR',
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(amountEur)
}

export function formatCount(count: number, singular: string, plural = `${singular}s`): string {
    return `${count.toLocaleString('en-US')} ${count === 1 ? singular : plural}`
}

/** The one-line summary under an organisation's name, shared by the row and Lucy. */
export function summariseFundingOrganisation(organisation: FundingOrganisation): string {
    return [
        organisation.country,
        formatCompactEur(organisation.fundingEur),
        formatCount(organisation.projectCount, 'project'),
        organisation.mergedRecords > 1 ? `${organisation.mergedRecords} merged records` : null,
    ]
        .filter(Boolean)
        .join(' · ')
}
