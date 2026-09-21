import type {ProjectDetail, ProjectRow} from '@heritagemonitor/shared'

// Presentation of project fields, in one place so a row, the overview tab and
// the chat context all phrase the same number the same way.

/**
 * Funding is always "approx.": amounts are converted to EUR with a fixed
 * rate table (D14) and only ~58% of projects carry one at all, so a precise
 * figure would overstate what the data knows.
 */
export function formatFunding(amountEur: number | null): string {
    if (amountEur == null) return 'no funding amount'
    return `approx. ${Math.round(amountEur).toLocaleString('en-US')} EUR`
}

export function formatYear(year: number | null): string {
    return year == null ? 'year unknown' : String(year)
}

/** "EC / H2020", or just the funder when the programme adds nothing. */
export function formatFunderProgramme(funder: string[], programme: string[]): string {
    const funders = funder.join(', ')
    const programmes = programme.filter((value) => value !== funders).join(', ')
    if (!funders) return programmes || 'funder unknown'
    return programmes ? `${funders} / ${programmes}` : funders
}

export function formatCount(count: number | null, singular: string, plural = `${singular}s`): string {
    const value = count ?? 0
    return `${value.toLocaleString('en-US')} ${value === 1 ? singular : plural}`
}

/**
 * Acronyms are NULL for 97% of projects, so the title carries the row; the
 * few projects that do have one ("ODYCCEUS") are recognised by it, hence both
 * when both exist.
 */
export function projectHeadline(project: ProjectRow | ProjectDetail): string {
    if (project.acronym && project.title) return `${project.acronym} — ${project.title}`
    return project.acronym ?? project.title ?? project.id
}
