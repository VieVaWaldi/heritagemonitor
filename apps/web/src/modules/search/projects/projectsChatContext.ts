import {
    bestFetchableSource,
    fetchableSources,
    httpUrlOrNull,
    projectLinks,
    type ProjectDetail,
    type ProjectOrganisation,
    type ProjectRow,
} from '@heritagemonitor/shared'
import {SELECTED_ENTITY_CHARS, type PageContextSection, type PageContextSource} from '@/common/llmchat/pageContext'
import {formatCount, formatFunderProgramme, formatFunding, formatYear, projectHeadline} from './projectFormat'

// What Lucy is told about the projects page. Kept out of the panel component
// (apps/web/RULES.md #7) and out of common/llmchat: only this module knows
// which project fields are worth a token and which are noise.

/** One line per visible row — cheap, and it is what the row itself shows. */
export function summarizeProjectRow(project: ProjectRow): string {
    const parts = [
        formatYear(project.year),
        formatFunderProgramme(project.funder, project.programme),
        formatFunding(project.funded_amount_eur),
        formatCount(project.org_count, 'organisation'),
        formatCount(project.work_count, 'work'),
        project.topic?.topic_name,
        project.is_ch ? 'digital cultural heritage' : null,
    ].filter(Boolean)
    return `- [${project.id}] ${projectHeadline(project)} (${parts.join(', ')})`
}

/**
 * The selected project as one long row (the overview tab's own fields), which
 * is why its section asks for SELECTED_ENTITY_CHARS: a project summary alone
 * can run to a couple of thousand characters, and it is the single most
 * useful thing on the page for a question like "what is this about?".
 */
function summarizeSelectedProject(project: ProjectDetail): string {
    const lines = [
        `Title: ${project.title ?? '(none)'}`,
        project.acronym ? `Acronym: ${project.acronym}` : null,
        `Id: ${project.id}${project.grantId ? `, grant ${project.grantId}` : ''}`,
        `Funding: ${formatFunding(project.funded_amount_eur)} from ${formatFunderProgramme(project.funder, project.programme)}`,
        `Runs: ${project.startDate ?? '?'} to ${project.endDate ?? '?'}`,
        `Scale: ${formatCount(project.org_count, 'organisation')}, ${formatCount(project.work_count, 'work')}`,
        project.topic
            ? `Topic: ${project.topic.topic_name} (${project.topic.subfield_name}, ${project.topic.field_name}, ${project.topic.domain_name})`
            : null,
        project.theme ? `Theme: ${project.theme}` : null,
        project.pillar_list.length ? `Pillars: ${project.pillar_list.join(', ')}` : null,
        project.org_countries.length ? `Countries: ${project.org_countries.join(', ')}` : null,
        project.org_names.length ? `Organisations: ${project.org_names.join('; ')}` : null,
        project.minority_qids.length ? `Minority tags (keyword-based, partly imprecise): ${project.minority_qids.join(', ')}` : null,
        project.is_ch ? `Classified as digital cultural heritage (score ${project.pred?.toFixed(3) ?? 'n/a'})` : null,
        project.is_translated ? 'Title/summary were machine-translated from another language.' : null,
        project.summary ? `Summary: ${project.summary}` : 'No summary in the data (true for most projects).',
    ].filter(Boolean)
    return lines.join('\n')
}

export function selectedProjectSection(project: ProjectDetail): PageContextSection {
    return {
        heading: `The project currently open in the detail panel — ${projectHeadline(project)}:`,
        rows: [summarizeSelectedProject(project)],
        maxCharsPerRow: SELECTED_ENTITY_CHARS,
    }
}

/** One line per organisation of a project — the fields the Organisations tab shows. */
export function summarizeProjectOrganisation(organisation: ProjectOrganisation): string {
    const parts = [
        organisation.countryCode,
        organisation.region,
        organisation.rorTypes.filter((type) => type !== 'unknown').join(', ') || null,
        organisation.project_count != null ? `${organisation.project_count} projects overall` : null,
        organisation.isCoordinator ? 'COORDINATOR' : null,
    ].filter(Boolean)
    return `- ${organisation.legalName ?? organisation.legalShortName ?? organisation.id} (${parts.join(', ')})`
}

/**
 * The organisations tab, when it is the one on screen. One line per row, the
 * same fields the tab shows — so "who is working on this?" is answered from
 * what the user can see, not from a second guess at the data.
 */
export function projectOrganisationsSection(project: ProjectDetail, organisations: ProjectOrganisation[], total: number): PageContextSection {
    return {
        heading: `Organisations of ${projectHeadline(project)} (${total} in total, coordinators first, showing ${organisations.length}):`,
        rows: organisations.map(summarizeProjectOrganisation),
    }
}

/**
 * The URLs Lucy may fetch, in the order the plan fixes: the selected
 * project's links first (she is most likely to be asked about that one), then
 * one link per listed row. Same `projectLinks` the overview renders, so she
 * can never be offered a link the user cannot see — and PDFs are never
 * inlined here, she fetches them herself.
 */
export function projectSources(
    selected: ProjectDetail | null,
    rows: ProjectRow[],
    organisations: ProjectOrganisation[] = [],
): PageContextSource[] {
    const sources: PageContextSource[] = []
    const seen = new Set<string>()

    const add = (label: string, url: string) => {
        if (seen.has(url)) return
        seen.add(url)
        sources.push({label, url})
    }

    // The selected project first: it is what a question is most likely about.
    // `fetchableSources` drops its doi.org link when CORDIS or OpenAIRE can
    // serve the same project — a DOI redirects off the fetch allowlist.
    if (selected) {
        for (const link of fetchableSources(projectLinks(selected))) add(`${projectHeadline(selected)} (${link.label})`, link.url)
    }
    // Then the organisations on screen, when their tab is open: their own
    // websites are what "tell me about these partners" needs.
    for (const organisation of organisations) {
        const website = httpUrlOrNull(organisation.websiteUrl)
        if (website) add(`${organisation.legalName ?? organisation.id} (website)`, website)
    }

    // Then the best FETCHABLE link per listed row, so "summarise these
    // projects" has something to fetch for each of them.
    for (const row of rows) {
        const best = bestFetchableSource(projectLinks(row))
        if (best) add(`${projectHeadline(row)} (${best.label})`, best.url)
    }

    return sources
}
