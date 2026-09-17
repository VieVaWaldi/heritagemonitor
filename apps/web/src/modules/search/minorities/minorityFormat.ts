import {MINORITY_SOURCE_CLASS_LABELS} from '@heritagemonitor/shared'

// Formatting/labelling helpers shared by every minorities/ component —
// kept here rather than duplicated across MinorityResultRow/
// MinorityOverviewTab, since both need the same population/source_class
// presentation.

export function labelSourceClass(value: string): string {
    return MINORITY_SOURCE_CLASS_LABELS[value] ?? value
}

// Wikidata's own redirect helper — resolves straight to the English
// Wikipedia article when one is linked, which reads far better than the
// raw Wikidata item page. Falls back to a small Wikidata "no linked page"
// page on the rare group with no enwiki sitelink, rather than a dead link.
export function wikipediaUrl(qid: string): string {
    return `https://www.wikidata.org/wiki/Special:GoToLinkedPage/enwiki/${qid}`
}

const COUNTRIES_CAP = 3

export function formatCountries(countries: string[]): string {
    if (countries.length === 0) return 'No countries documented'
    if (countries.length <= COUNTRIES_CAP) return countries.join(', ')
    return `${countries.slice(0, COUNTRIES_CAP).join(', ')} +${countries.length - COUNTRIES_CAP} more`
}

// The population range spans 7 to 133,000,000 — compact notation ("133M")
// keeps the row/panel readable across that whole spread instead of a long
// grouped-digit string.
const populationFormatter = new Intl.NumberFormat('en', {notation: 'compact', maximumFractionDigits: 1})

export function formatPopulation(population: number | null): string {
    return population == null ? 'Population not documented' : populationFormatter.format(population)
}
