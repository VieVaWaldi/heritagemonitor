import {fetchableSources, organisationLinks, type ExpertRow, type OrganisationDetail} from '@heritagemonitor/shared'
import {SELECTED_ENTITY_CHARS, type PageContextSection, type PageContextSource} from '@/common/llmchat/pageContext'
import {formatCount, formatOrganisationFunding, knownRegion, organisationName} from '../organisations/organisationFormat'

// What Lucy is told about the experts page. The distinction that matters here
// is between "projects matching this search" and the organisation's lifetime
// totals — she must never present one as the other.

export function summarizeExpertRow(expert: ExpertRow): string {
    const parts = [
        expert.countryCode,
        knownRegion(expert.region),
        `${expert.matchedProjects} projects matching the current search`,
        `${formatCount(expert.project_count, 'project')} in total`,
        formatOrganisationFunding(expert.total_funding_eur),
        expert.mergedRecords > 1 ? `${expert.mergedRecords} duplicate index records merged` : null,
    ].filter(Boolean)
    return `- [${expert.id}] ${organisationName(expert)} (${parts.join(', ')})`
}

export function selectedExpertSection(organisation: OrganisationDetail, matchedProjects: number | null): PageContextSection {
    const lines = [
        `Organisation: ${organisationName(organisation)} (id ${organisation.id})`,
        matchedProjects != null
            ? `${matchedProjects} of its projects match the current search — this is what ranks it as an expert here.`
            : null,
        `Lifetime totals: ${formatCount(organisation.project_count, 'project')}, ${formatCount(organisation.work_count, 'publication')}`,
        `Funding: ${formatOrganisationFunding(organisation.total_funding_eur)} — an equal-split share of its projects' budgets, not its own budget`,
        `Location: ${[organisation.countryCode, organisation.region, organisation.address_city].filter(Boolean).join(', ') || 'unknown'}`,
        organisation.rorTypes.length ? `Type: ${organisation.rorTypes.join(', ')}` : null,
        organisation.rorId ? `ROR: ${organisation.rorId}` : null,
        // There is no person-level data anywhere in this platform.
        'This platform has no individual researchers: an "expert" here is an ORGANISATION that did matching work.',
    ].filter(Boolean)

    return {
        heading: `The organisation currently open in the detail panel — ${organisationName(organisation)}:`,
        rows: [lines.join('\n')],
        maxCharsPerRow: SELECTED_ENTITY_CHARS,
    }
}

/** Direct hosts only — website and ROR, never a redirector. */
export function expertSources(selected: OrganisationDetail | null, rows: ExpertRow[]): PageContextSource[] {
    const sources: PageContextSource[] = []
    const seen = new Set<string>()

    const add = (label: string, url: string) => {
        if (seen.has(url)) return
        seen.add(url)
        sources.push({label, url})
    }

    if (selected) {
        for (const link of fetchableSources(organisationLinks(selected))) {
            add(`${organisationName(selected)} (${link.label})`, link.url)
        }
    }
    for (const row of rows) {
        const best = fetchableSources(organisationLinks(row))[0]
        if (best) add(`${organisationName(row)} (${best.label})`, best.url)
    }

    return sources
}
