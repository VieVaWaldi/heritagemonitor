import type {OrganisationDetail, OrganisationRow} from '@heritagemonitor/shared'

// Presentation of organisation fields, in one place so a row, the overview tab
// and the chat context phrase the same number the same way.

/**
 * Funding is always "approx.": it is the sum of each project's amount split
 * equally across its organisations (D13), converted to EUR at fixed rates, and
 * only ~58% of projects carry an amount at all.
 */
export function formatOrganisationFunding(amountEur: number | null): string {
    if (amountEur == null) return 'no funding recorded'
    return `approx. ${Math.round(amountEur).toLocaleString('en-US')} EUR`
}

export function formatCount(count: number | null, singular: string, plural = `${singular}s`): string {
    const value = count ?? 0
    return `${value.toLocaleString('en-US')} ${value === 1 ? singular : plural}`
}

/** ROR's type vocabulary carries an explicit `unknown`, which is noise on screen. */
export function knownRorTypes(rorTypes: string[]): string[] {
    return rorTypes.filter((type) => type !== 'unknown')
}

/** The region field has an `Unknown` bucket for the 157k organisations nobody placed. */
export function knownRegion(region: string | null): string | null {
    return region && region !== 'Unknown' ? region : null
}

export function organisationName(organisation: OrganisationRow | OrganisationDetail): string {
    return organisation.legalName ?? organisation.legalShortName ?? organisation.id
}
