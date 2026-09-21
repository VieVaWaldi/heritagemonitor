import {MINORITY_SOURCE_CLASS_LABELS, type MinorityDto} from '@heritagemonitor/shared'

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
