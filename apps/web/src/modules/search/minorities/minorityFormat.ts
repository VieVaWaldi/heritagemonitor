import {MINORITY_SOURCE_CLASS_LABELS, type MinorityDto} from '@heritagemonitor/shared'
// Relative with extension: this file is unit-tested by Node's own runner.
import {SEARCH_PARAM} from '../../../common/url/codecs.ts'
import {RELATED_RELATIONS} from '../entity/relatedParams.ts'

// Presentation of minority fields, in one place so the row, the overview tab
// and the chat context phrase the same thing the same way.

/**
 * The honest caveat that belongs anywhere counts are shown. The tags come
 * from matching group names and keywords against project text, so they
 * over-count common words (Russians 2,242 projects, Turkish 1,676) — the
 * numbers are a starting point for looking, not a measurement.
 */
export const MINORITY_COUNT_DISCLAIMER =
    'Counts come from keyword matching between project text and group names, so they include false positives — treat them as a place to start looking, not as a measurement.'

export function labelSourceClass(value: string): string {
    return MINORITY_SOURCE_CLASS_LABELS[value] ?? value.charAt(0).toUpperCase() + value.slice(1)
}

export function formatPopulation(population: number | null): string {
    if (population == null) return 'population unknown'
    return `${Math.round(population).toLocaleString('en-US')} people`
}

export function formatCountries(countries: string[]): string {
    if (countries.length === 0) return 'no countries documented'
    if (countries.length <= 3) return countries.join(', ')
    return `${countries.slice(0, 3).join(', ')} +${countries.length - 3} more`
}

export function formatCount(count: number | null, singular: string, plural = `${singular}s`): string {
    const value = count ?? 0
    return `${value.toLocaleString('en-US')} ${value === 1 ? singular : plural}`
}

/**
 * Wikidata is where every group comes from, so its entity page always exists
 * and always serves its own content — unlike a Wikipedia title guessed from a
 * name, which is why the qid page is what the UI and Lucy both get.
 */
export function wikidataUrl(qid: string): string {
    return `https://www.wikidata.org/wiki/${encodeURIComponent(qid)}`
}

export function minorityName(minority: MinorityDto): string {
    return minority.group_name_en
}

/**
 * The count on a group's ROW. In the DCH corpus the row shows the group's
 * digital-cultural-heritage projects, labelled as such, because the Projects
 * tab beside it lists only those — "1,344 projects" next to a tab of 295 was
 * two different numbers under one name. The science corpus keeps the plain
 * wording.
 */
export function formatRowProjectCount(minority: MinorityDto, corpus: string | undefined): string {
    return corpus === 'dch'
        ? formatCount(minority.dch_project_count, 'DCH project')
        : formatCount(minority.project_count, 'project')
}

/**
 * Whether the page narrows this tab's list below the group's own total: search
 * text or a project filter that the relation forwards, or the DCH corpus.
 * (The corpus always carries; only `dch` narrows.) Params the relation does
 * not forward cannot narrow it, so they do not count.
 */
export function isTabNarrowed(relation: string, params: URLSearchParams): boolean {
    const carried = RELATED_RELATIONS[relation]?.carry ?? []
    return carried.some((name) => {
        const values = params.getAll(name).filter((value) => value !== '')
        return name === SEARCH_PARAM.corpus ? values.includes('dch') : values.length > 0
    })
}

/**
 * " · of 1,344 in total" for a tab count that the page's text or corpus has
 * narrowed, so the number beside the tab and the group's own figure are never
 * two unexplained numbers. Empty when nothing narrows it, when there is no
 * total, or when the two already agree.
 */
export function ofTotalSuffix(shown: number, total: number | null, narrowed: boolean): string {
    if (!narrowed || total == null || total === shown) return ''
    return ` (of ${total.toLocaleString('en-US')} in total)`
}
