import {MINORITY_SOURCE_CLASS_LABELS} from '@heritagemonitor/shared'

// Formatting/labelling helpers shared by every minorities/ component —
// kept here rather than duplicated across MinorityResultRow/
// MinorityOverviewTab, since both need the same population/source_class
// presentation.

export function labelSourceClass(value: string): string {
    return MINORITY_SOURCE_CLASS_LABELS[value] ?? value
}

export function wikidataUrl(qid: string): string {
    return `https://www.wikidata.org/wiki/${qid}`
}

const COUNTRIES_CAP = 3

export function formatCountries(countries: string[]): string {
    if (countries.length === 0) return 'No countries documented'
    if (countries.length <= COUNTRIES_CAP) return countries.join(', ')
    return `${countries.slice(0, COUNTRIES_CAP).join(', ')} +${countries.length - COUNTRIES_CAP} more`
}

// The population range spans 7 to 133,000,000 (see index_meilisearch.py's
// facetStats) — compact notation ("133M") keeps the row/panel readable
// across that whole spread instead of a long grouped-digit string.
const populationFormatter = new Intl.NumberFormat('en', {notation: 'compact', maximumFractionDigits: 1})

export function formatPopulation(population: number | null): string {
    return population == null ? 'Population not documented' : populationFormatter.format(population)
}
