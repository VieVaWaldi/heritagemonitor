import {
    fetchableSources,
    grantTitle,
    organisationLinks,
    type FundingOrganisation,
    type GrantDetail,
    type OrganisationDetail,
    type ProjectRow,
} from '@heritagemonitor/shared'
import {SELECTED_ENTITY_CHARS, type PageContextSection, type PageContextSource} from '@/common/llmchat/pageContext'
import {FUNDING_AMOUNT_CAVEAT, formatCompactEur, formatCount, formatFundingEur} from './fundingFormat'

// What Lucy is told about the funding page. Kept out of the panel component
// (apps/web/RULES.md #7): only this module knows which funding fields are
// worth a token.

/** One ranked organisation: country, its share, how many projects. */
export function summariseFundingRow(organisation: FundingOrganisation): string {
    const parts = [
        organisation.country,
        formatCompactEur(organisation.fundingEur),
        formatCount(organisation.projectCount, 'project'),
        organisation.hasGeo ? null : 'no coordinates (not on the map)',
    ].filter(Boolean)
    return `- [${organisation.id}] ${organisation.name} (${parts.join(', ')})`
}

/** The selected organisation, as one long row — hence SELECTED_ENTITY_CHARS. */
export function selectedFundingOrganisationSection(organisation: FundingOrganisation, projects: ProjectRow[]): PageContextSection {
    const lines = [
        `Name: ${organisation.name}`,
        `Id: ${organisation.id}`,
        `Location: ${[organisation.country, organisation.region].filter(Boolean).join(', ') || 'unknown'}`,
        `Funding under the current filters: ${formatFundingEur(organisation.fundingEur)} across ${formatCount(organisation.projectCount, 'matching project')}`,
        `Caveat: ${FUNDING_AMOUNT_CAVEAT}`,
        organisation.mergedRecords > 1
            ? `This row merges ${organisation.mergedRecords} index records of the same institution (the index holds duplicates).`
            : null,
        organisation.hasGeo ? null : 'Has no coordinates, so it is in the ranking but not on the map.',
        projects.length > 0
            ? `Its matching projects (page shown): ${projects.map((project) => project.acronym ?? project.title ?? project.id).join('; ')}`
            : null,
    ].filter(Boolean)

    return {
        heading: `The organisation currently open in the detail panel — ${organisation.name}:`,
        rows: [lines.join('\n')],
        maxCharsPerRow: SELECTED_ENTITY_CHARS,
    }
}

/** The funding stream driving the page, when one is picked on the Programmes tab. */
export function selectedProgrammeSection(grant: GrantDetail): PageContextSection {
    const lines = [
        `Name: ${grantTitle(grant)}`,
        `Id: ${grant.id}`,
        [grant.funder_name ?? grant.funder, grant.programme, grant.action].filter(Boolean).join(' > '),
        `Heritage projects: ${grant.dch_project_count ?? 0} of ${grant.project_count ?? 0} in the whole stream`,
        grant.is_pseudo ? 'This is NOT a real programme: it collects projects of this funder with no funding stream recorded.' : null,
    ].filter(Boolean)

    return {
        heading: 'Everything on this page is narrowed to one funding stream:',
        rows: [lines.join('\n')],
        maxCharsPerRow: SELECTED_ENTITY_CHARS,
    }
}

/**
 * The URLs Lucy may fetch. Only the selected organisation has any: a funding
 * stream carries no URL on the index (see the grants module), and a ranked row
 * is a name and a number, not a document.
 */
export function fundingSources(selected: OrganisationDetail | null): PageContextSource[] {
    if (!selected) return []
    return fetchableSources(organisationLinks(selected)).map((link) => ({
        label: `${selected.legalName ?? selected.id} (${link.label})`,
        url: link.url,
    }))
}
