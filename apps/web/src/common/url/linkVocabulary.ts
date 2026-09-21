import {SEARCH_PARAM, URL_PARAM_LABELS, type SearchParamName} from './codecs.ts'

// The authoritative "how to build a link to this app" guide, GENERATED from
// the same constants the app itself reads.
//
// WHY THIS EXISTS: Lucy answered with `/search?corpus=dch`. The param is `c`,
// so the link looked right, was clickable, and silently did nothing. She had
// no vocabulary to work from and guessed a plausible English word.
//
// Generated, never hand-written: a second hand-maintained list of params would
// drift from SEARCH_PARAM within a week and produce exactly the same class of
// bug. The test in apps/web/test asserts that every param in SEARCH_PARAM
// appears here, so adding one without describing it fails the build.

/** Values an enum-ish param accepts, for the ones where a wrong value silently does nothing. */
const ALLOWED_VALUES: Partial<Record<SearchParamName, readonly string[]>> = {
    [SEARCH_PARAM.entity]: ['projects', 'works', 'organisations', 'grants'],
    [SEARCH_PARAM.corpus]: ['science', 'dch'],
    [SEARCH_PARAM.layer]: ['hexes'],
    [SEARCH_PARAM.allWorks]: ['true'],
    [SEARCH_PARAM.hasGeo]: ['true'],
    [SEARCH_PARAM.coordinators]: ['true'],
}

/** Formats that are not obvious from the name alone. */
const FORMATS: Partial<Record<SearchParamName, string>> = {
    [SEARCH_PARAM.years]: '2019-2024',
    [SEARCH_PARAM.view]: 'lat,lng,zoom (4 decimals)',
    [SEARCH_PARAM.page]: 'a number from 1',
    [SEARCH_PARAM.topic]: 'numeric topic id, repeat the param for several',
    [SEARCH_PARAM.subfield]: 'numeric id, repeatable',
    [SEARCH_PARAM.field]: 'numeric id, repeatable',
    [SEARCH_PARAM.stream]: 'funder::programme[::action] — percent-encode it',
    [SEARCH_PARAM.center]: 'an organisation id (find it from an organisation link or its suggest result)',
    [SEARCH_PARAM.sort]: 'depends on the entity; omit it unless asked for a specific order',
}

/** Params that may appear more than once in one URL. */
const REPEATABLE: readonly string[] = [
    SEARCH_PARAM.theme,
    SEARCH_PARAM.pillar,
    SEARCH_PARAM.funder,
    SEARCH_PARAM.programme,
    SEARCH_PARAM.jurisdiction,
    SEARCH_PARAM.region,
    SEARCH_PARAM.country,
    SEARCH_PARAM.orgType,
    SEARCH_PARAM.topic,
    SEARCH_PARAM.subfield,
    SEARCH_PARAM.field,
    SEARCH_PARAM.only,
    SEARCH_PARAM.stream,
]

/** The routes Lucy may link to, with what each is for. */
const ROUTES: ReadonlyArray<{route: string; what: string; examples: readonly string[]}> = [
    {
        route: '/search',
        what: 'search projects, works, organisations or grants — pick with e=',
        examples: ['/search?e=projects&q=photogrammetry&c=dch', '/search?e=grants&q=virtual%20reality&c=dch'],
    },
    {
        route: '/search/minorities',
        what: 'minority groups and the research about them',
        examples: ['/search/minorities?q=Sami&c=dch', '/search/minorities?country=Germany&c=dch'],
    },
    {
        route: '/search/experts',
        what: 'organisations ranked by how many matching projects they ran',
        examples: ['/search/experts?q=photogrammetry&c=dch'],
    },
    {
        route: '/search/funding',
        what: 'organisations ranked by the money that reached them, with a map',
        examples: ['/search/funding?q=heritage&c=dch', '/search/funding?c=dch&country=SE'],
    },
    {
        route: '/search/collaboration/organisationNetwork',
        what: 'who works with whom, centred on an organisation',
        examples: ['/search/collaboration/organisationNetwork?center=<organisation id>&c=dch'],
    },
]

/**
 * A compact block describing every param and route, for the chat context.
 *
 * Deliberately terse: it rides in EVERY message, so it is budgeted like a
 * section rather than written like documentation.
 */
export function describeLinkVocabulary(): string[] {
    const params = (Object.values(SEARCH_PARAM) as SearchParamName[]).map((name) => {
        const parts = [URL_PARAM_LABELS[name]]
        const allowed = ALLOWED_VALUES[name]
        if (allowed) parts.push(`one of ${allowed.join('|')}`)
        const format = FORMATS[name]
        if (format) parts.push(format)
        if (REPEATABLE.includes(name)) parts.push('repeatable')
        return `${name} = ${parts.join('; ')}`
    })

    return [
        'HOW TO BUILD LINKS TO THIS APP. Use ONLY the parameter names below — they are the real ones. Never invent a parameter or guess an English word for it (there is no "corpus", "entity" or "query" parameter). Percent-encode values. Omit anything you are unsure of.',
        `Parameters: ${params.join(' | ')}`,
        ...ROUTES.map((route) => `${route.route} — ${route.what}. e.g. ${route.examples.join(' , ')}`),
    ]
}

// --- defence in depth -------------------------------------------------------

/**
 * Plausible names Lucy (or anyone) might reach for, mapped to the real ones.
 *
 * Explicit and small on purpose: a fuzzy matcher would "correct" a param the
 * app genuinely does not have into one it does, which is worse than dropping it.
 */
const ALIASES: Readonly<Record<string, SearchParamName>> = {
    corpus: SEARCH_PARAM.corpus,
    entity: SEARCH_PARAM.entity,
    query: SEARCH_PARAM.query,
    search: SEARCH_PARAM.query,
    text: SEARCH_PARAM.query,
    type: SEARCH_PARAM.entity,
    selected: SEARCH_PARAM.selection,
    id: SEARCH_PARAM.only,
    year: SEARCH_PARAM.years,
    countries: SEARCH_PARAM.country,
    topics: SEARCH_PARAM.topic,
    funders: SEARCH_PARAM.funder,
    programmes: SEARCH_PARAM.programme,
    organisationType: SEARCH_PARAM.orgType,
}

const KNOWN_PARAMS = new Set<string>(Object.values(SEARCH_PARAM))

/**
 * Repairs an app link before it is followed.
 *
 * The vocabulary above is the fix; this is the seatbelt. It renames known
 * aliases, lowercases the values of the enum params (where `DCH` would
 * otherwise fail an exact match), and DROPS anything it does not recognise —
 * an unknown param is either a hallucination or a typo, and carrying it into
 * the URL only makes the bad link look legitimate.
 *
 * Path and hash are never touched.
 */
export function normalizeAppLink(href: string): string {
    const [pathAndQuery, hash] = href.split('#')
    const [path, query] = pathAndQuery.split('?')
    if (!query) return href

    const next = new URLSearchParams()
    for (const [rawName, value] of new URLSearchParams(query)) {
        const name = KNOWN_PARAMS.has(rawName) ? rawName : ALIASES[rawName]
        if (!name) continue

        const allowed = ALLOWED_VALUES[name as SearchParamName]
        // Enum values are matched exactly downstream, so `DCH` would be
        // dropped by the reader as an invalid value.
        next.append(name, allowed ? value.toLowerCase() : value)
    }

    const search = next.toString()
    return `${path}${search ? `?${search}` : ''}${hash ? `#${hash}` : ''}`
}
