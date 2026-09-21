import {
    GRANT_FUNDING_CAVEAT,
    PSEUDO_GRANT_DESCRIPTION,
    grantHierarchy,
    type GrantDetail,
    type GrantOrganisation,
    type GrantRow,
    type ProjectRow,
} from '@heritagemonitor/shared'
import {SELECTED_ENTITY_CHARS, type PageContextSection} from '@/common/llmchat/pageContext'
import {formatCount, formatGrantFunding, grantFunder, grantTitle, heritageShare} from './grantFormat'

// What Lucy is told about the grants page. Kept out of the panel component
// (apps/web/RULES.md #7): only this module knows which stream fields are worth
// a token.
//
// There is no `grantSources` counterpart to the other entities' source lists:
// the grants index carries no URL for a stream, so there is nothing she could
// be allowed to fetch. See the report's index gaps.

export function summarizeGrantRow(grant: GrantRow): string {
    const parts = [
        grantFunder(grant),
        grant.jurisdiction,
        formatCount(grant.dch_project_count, 'cultural-heritage project'),
        formatCount(grant.project_count, 'project in total'),
        heritageShare(grant),
        formatGrantFunding(grant.total_funded_eur),
        grant.is_pseudo ? 'NOT a real programme: projects of this funder with no funding stream recorded' : null,
    ].filter(Boolean)
    return `- [${grant.id}] ${grantTitle(grant)} (${parts.join(', ')})`
}

/** The selected stream as one long row — hence SELECTED_ENTITY_CHARS. */
export function selectedGrantSection(grant: GrantDetail): PageContextSection {
    const hierarchy = grantHierarchy(grant)
        .map((level) => `${level.level}: ${level.value}`)
        .join(' > ')

    const lines = [
        `Name: ${grantTitle(grant)}`,
        `Id: ${grant.id} (this is also the value of a project's funding_stream_ids)`,
        hierarchy ? `Hierarchy: ${hierarchy}` : null,
        grant.jurisdiction ? `Jurisdiction: ${grant.jurisdiction}` : null,
        `Projects: ${formatCount(grant.dch_project_count, 'cultural-heritage project')} of ${formatCount(grant.project_count, 'project')} in total${heritageShare(grant) ? ` (${heritageShare(grant)})` : ''}`,
        `Funding: ${formatGrantFunding(grant.total_funded_eur)} — ${GRANT_FUNDING_CAVEAT}`,
        grant.is_pseudo ? PSEUDO_GRANT_DESCRIPTION : null,
    ].filter(Boolean)

    return {
        heading: `The funding stream currently open in the detail panel — ${grantTitle(grant)}:`,
        rows: [lines.join('\n')],
        maxCharsPerRow: SELECTED_ENTITY_CHARS,
    }
}

/** The projects tab, when it is the one on screen. */
export function grantProjectsSection(grant: GrantDetail, projects: ProjectRow[], total: string): PageContextSection {
    return {
        heading: `Projects funded by ${grantTitle(grant)} (${total} in total, largest budget first, showing ${projects.length}):`,
        rows: projects.map((project) => {
            const parts = [
                project.year != null ? String(project.year) : null,
                project.funded_amount_eur != null ? `approx. ${Math.round(project.funded_amount_eur)} EUR` : null,
                project.topic?.topic_name ?? null,
            ].filter(Boolean)
            return `- [${project.id}] ${project.acronym ?? project.title ?? project.id} (${parts.join(', ')})`
        }),
    }
}

/** The organisations tab, when it is the one on screen. */
export function grantOrganisationsSection(grant: GrantDetail, organisations: GrantOrganisation[]): PageContextSection {
    return {
        heading: `Organisations most involved in ${grantTitle(grant)}'s projects (top ${organisations.length} by project count; the EUR figure is each organisation's lifetime total across ALL its work, not this stream's):`,
        rows: organisations.map(
            (organisation) =>
                `- [${organisation.id}] ${organisation.name} (${[organisation.country, `${organisation.projects} projects in this stream`, formatGrantFunding(organisation.total_funding_eur)].filter(Boolean).join(', ')})`,
        ),
    }
}
