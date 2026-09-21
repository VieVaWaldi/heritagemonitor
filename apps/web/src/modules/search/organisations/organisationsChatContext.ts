import {
    fetchableSources,
    httpUrlOrNull,
    organisationLinks,
    type OrganisationDetail,
    type OrganisationProject,
    type OrganisationRow,
} from '@heritagemonitor/shared'
import {SELECTED_ENTITY_CHARS, type PageContextSection, type PageContextSource} from '@/common/llmchat/pageContext'
import {formatCount, formatOrganisationFunding, knownRegion, knownRorTypes, organisationName} from './organisationFormat'

// What Lucy is told about the organisations page. Kept out of the panel
// component (apps/web/RULES.md #7) and out of common/llmchat: only this module
// knows which organisation fields are worth a token.

export function summarizeOrganisationRow(organisation: OrganisationRow): string {
    const parts = [
        organisation.countryCode,
        knownRegion(organisation.region),
        knownRorTypes(organisation.rorTypes).join(', ') || null,
        formatCount(organisation.project_count, 'project'),
        formatCount(organisation.work_count, 'work'),
        formatOrganisationFunding(organisation.total_funding_eur),
        organisation.has_dch_project ? 'works on digital cultural heritage' : null,
    ].filter(Boolean)
    return `- [${organisation.id}] ${organisationName(organisation)} (${parts.join(', ')})`
}

/**
 * The selected organisation as one long row (the overview tab's own fields),
 * which is why its section asks for SELECTED_ENTITY_CHARS.
 */
export function selectedOrganisationSection(organisation: OrganisationDetail): PageContextSection {
    const lines = [
        `Name: ${organisationName(organisation)}`,
        organisation.legalShortName ? `Short name: ${organisation.legalShortName}` : null,
        organisation.alternativeNames.length ? `Also known as: ${organisation.alternativeNames.join('; ')}` : null,
        `Id: ${organisation.id}${organisation.rorId ? `, ROR ${organisation.rorId}` : ''}`,
        `Location: ${[organisation.countryCode, organisation.region, organisation.address_city].filter(Boolean).join(', ') || 'unknown'}`,
        organisation.hasGeo ? 'Has coordinates (can appear on maps).' : 'No coordinates (cannot appear on maps).',
        organisation.rorTypes.length ? `Type: ${organisation.rorTypes.join(', ')}` : null,
        `Research: ${formatCount(organisation.project_count, 'project')}, ${formatCount(organisation.work_count, 'work')}, ${formatCount(organisation.dch_project_count, 'digital cultural heritage project')}`,
        `Funding: ${formatOrganisationFunding(organisation.total_funding_eur)} — an equal-split share of its projects' budgets, not its own budget`,
        organisation.name_key ? `Duplicate-merge key: ${organisation.name_key} (the same institution can appear under several ids)` : null,
    ].filter(Boolean)

    return {
        heading: `The organisation currently open in the detail panel — ${organisationName(organisation)}:`,
        rows: [lines.join('\n')],
        maxCharsPerRow: SELECTED_ENTITY_CHARS,
    }
}

/** The projects tab, when it is the one on screen. */
export function organisationProjectsSection(
    organisation: OrganisationDetail,
    projects: OrganisationProject[],
    total: string,
): PageContextSection {
    return {
        heading: `Projects of ${organisationName(organisation)} (${total} in total, largest budget first, showing ${projects.length}):`,
        rows: projects.map((project) => {
            const parts = [
                project.year != null ? String(project.year) : null,
                [...project.funder, ...project.programme].join('/') || null,
                project.funded_amount_eur != null ? `approx. ${Math.round(project.funded_amount_eur)} EUR` : null,
                project.isCoordinator ? 'COORDINATED BY THIS ORGANISATION' : null,
            ].filter(Boolean)
            return `- [${project.id}] ${project.acronym ?? project.title ?? project.id} (${parts.join(', ')})`
        }),
    }
}

/**
 * The URLs Lucy may fetch: the selected organisation's own links first, then
 * one website per listed organisation. Same `organisationLinks` the overview
 * renders, so she can never be offered a link the user cannot see.
 */
export function organisationSources(
    selected: OrganisationDetail | null,
    rows: OrganisationRow[],
): PageContextSource[] {
    const sources: PageContextSource[] = []
    const seen = new Set<string>()

    const add = (label: string, url: string) => {
        if (seen.has(url)) return
        seen.add(url)
        sources.push({label, url})
    }

    // Website and ROR first, both of which serve their own content.
    if (selected) {
        for (const link of fetchableSources(organisationLinks(selected))) {
            add(`${organisationName(selected)} (${link.label})`, link.url)
        }
    }
    for (const row of rows) {
        const website = httpUrlOrNull(row.websiteUrl)
        if (website) add(`${organisationName(row)} (website)`, website)
    }

    return sources
}
