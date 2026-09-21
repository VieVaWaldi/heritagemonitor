import type {MinorityDto, MinorityFunder, MinorityTopic} from '@heritagemonitor/shared'
import {SELECTED_ENTITY_CHARS, type PageContextSection, type PageContextSource} from '@/common/llmchat/pageContext'
import {MINORITY_COUNT_DISCLAIMER, formatCount, formatPopulation, labelSourceClass, wikidataUrl} from './minorityFormat'

// What Lucy is told about the minorities page.

export function summarizeMinorityRow(minority: MinorityDto): string {
    const parts = [
        labelSourceClass(minority.source_class[0] ?? 'unclassified'),
        minority.countries.join(', ') || 'no countries documented',
        formatPopulation(minority.population),
        formatCount(minority.project_count, 'project'),
        formatCount(minority.work_count, 'publication'),
        minority.is_seed ? 'seed group of this research programme' : null,
    ].filter(Boolean)
    return `- [${minority.qid}] ${minority.group_name_en} (${parts.join(', ')})`
}

export function selectedMinoritySection(minority: MinorityDto): PageContextSection {
    const lines = [
        `Group: ${minority.group_name_en} (Wikidata ${minority.qid})`,
        minority.is_seed ? 'This is a SEED group: the research programme selected it to study.' : null,
        `Population: ${formatPopulation(minority.population)}`,
        minority.source_class.length ? `Type: ${minority.source_class.map(labelSourceClass).join(', ')}` : null,
        minority.countries.length ? `Countries: ${minority.countries.join(', ')}` : null,
        minority.religions.length ? `Religions: ${minority.religions.join(', ')}` : null,
        minority.native_languages.length ? `Native languages: ${minority.native_languages.join(', ')}` : null,
        minority.subclass_of.length ? `Subclass of: ${minority.subclass_of.join(', ')}` : null,
        minority.admin_territory.length ? `Admin territory: ${minority.admin_territory.join(', ')}` : null,
        minority.ancestral_home.length ? `Ancestral home: ${minority.ancestral_home.join(', ')}` : null,
        `Research: ${formatCount(minority.project_count, 'project')}, ${formatCount(minority.work_count, 'publication')}, ${formatCount(minority.org_count, 'organisation')}, ${formatCount(minority.dch_project_count, 'digital cultural heritage project')}`,
        // Lucy must never present these counts as measurements.
        `IMPORTANT: ${MINORITY_COUNT_DISCLAIMER}`,
        (minority.project_count ?? 0) === 0
            ? 'No projects in the index mention this group — say so plainly if asked; it is a finding, not missing data.'
            : null,
        minority.known_subgroups.length
            ? `Documented subgroups: ${minority.known_subgroups.map((subgroup) => subgroup.name).join('; ')}`
            : 'No documented subgroups.',
        minority.merged_qids.filter((qid) => qid !== minority.qid).length
            ? `Merged Wikidata ids: ${minority.merged_qids.join(', ')}`
            : null,
    ].filter(Boolean)

    return {
        heading: `The minority group currently open in the detail panel — ${minority.group_name_en}:`,
        rows: [lines.join('\n')],
        maxCharsPerRow: SELECTED_ENTITY_CHARS,
    }
}

export function minorityTopicsSection(minority: MinorityDto, topics: MinorityTopic[], total: number): PageContextSection {
    return {
        heading: `Research topics of ${minority.group_name_en}'s projects (${total} in total, showing ${topics.length}):`,
        rows: topics.map((topic) => `- ${topic.topic_name} (${topic.field_name ?? 'no field'}): ${topic.project_count} projects`),
    }
}

export function minorityFundersSection(minority: MinorityDto, funders: MinorityFunder[], total: number): PageContextSection {
    return {
        heading: `Funders of ${minority.group_name_en}'s projects (${total} in total, showing ${funders.length}):`,
        rows: funders.map(
            (funder) => `- ${funder.funder}${funder.programmes.length ? ` (${funder.programmes.join(', ')})` : ''}: ${funder.project_count} projects`,
        ),
    }
}

/**
 * Wikidata is the only URL a group always has, and it serves its own content —
 * so it is both a valid source and one the fetch allowlist can actually use.
 */
export function minoritySources(selected: MinorityDto | null, rows: MinorityDto[]): PageContextSource[] {
    const sources: PageContextSource[] = []
    const seen = new Set<string>()

    const add = (label: string, url: string) => {
        if (seen.has(url)) return
        seen.add(url)
        sources.push({label, url})
    }

    if (selected) add(`${selected.group_name_en} (Wikidata)`, wikidataUrl(selected.qid))
    for (const row of rows) add(`${row.group_name_en} (Wikidata)`, wikidataUrl(row.qid))

    return sources
}
