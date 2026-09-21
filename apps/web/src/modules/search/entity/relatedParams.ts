// Relative, not the `@/` alias: this module is unit-tested by Node's own test
// runner (see apps/web/test/urlCodecs.test.ts), which does not resolve the
// webpack alias. codecs.ts is importable the same way for the same reason.
import {SEARCH_PARAM} from '../../../common/url/codecs.ts'

// Which of the page's own filters carry into a tab list, and why the rest do
// not.
//
// THE PROBLEM THIS SOLVES. A tab list is a second search living inside a
// detail panel: "this group's projects", "this stream's projects". Users
// reasonably expect it to respect what they set on the page around it — if the
// list is filtered to Horizon Europe and 2019-2025, the projects tab showing
// that organisation's 1990s national grants is confusing.
//
// But carrying EVERY param is just as wrong, and `q` is the hard case: it
// means different things on different pages.
//
// The test is NOT "which entity is listed" but "how did the parent search
// match". Three groups:
//
//  1. `q` reaches the parent THROUGH ITS PROJECTS — experts, funding, grants
//     (two-step since the grants search learned to find streams via
//     `funding_stream_ids`, see query/grants.ts) and minorities (two-step via
//     the project probe). A stream listed for "virtual reality" was listed
//     BECAUSE it funded VR projects, so its Projects tab must show those, not
//     all 1,402 of them. Here `q` carries.
//  2. `q` is a pure NAME search — organisations (legalName/shortName/
//     alternativeNames only). Sending an institution's name to the projects
//     index asks for projects whose text says "Fraunhofer" and returns
//     roughly nothing. Here it does not carry.
//  3. The target cannot answer it — a work's own text has nothing to do with
//     the organisations that produced it. Here it does not carry either.
//
// Group 1 is the one that drifted: these relations were written before the
// grants and minorities searches became project-aware, so they claimed `q`
// "searches funding-stream names" long after that stopped being the whole
// truth.
//
// So the rule is per relation and written down once, here, with the reason for
// every omission — a list that silently ignores half the page is a bug report
// waiting to happen, which is why `relatedFilterCaption` turns this table into
// a sentence shown above every such list.

/** The project filters a page may hold, in the order the caption names them. */
const PROJECT_FILTER_PARAMS = [
    SEARCH_PARAM.years,
    SEARCH_PARAM.funder,
    SEARCH_PARAM.programme,
    SEARCH_PARAM.region,
    SEARCH_PARAM.pillar,
    SEARCH_PARAM.theme,
    SEARCH_PARAM.topic,
    SEARCH_PARAM.subfield,
    SEARCH_PARAM.field,
] as const

/** The corpus always carries: it is the lens over the whole app, not a filter. */
const ALWAYS = [SEARCH_PARAM.corpus] as const

export interface RelatedRelation {
    /** Params forwarded to the tab list's own request. */
    carry: readonly string[]
    /**
     * Params the page has that are deliberately NOT forwarded, each with the
     * reason shown to the user. Keyed by param name.
     */
    omit: Readonly<Record<string, string>>
}

/**
 * Keyed `<page>:<what the tab lists>`.
 *
 * `page` is the entity on `/search` or the use-case key elsewhere; the second
 * half is the kind of thing in the list, because the same page can have tabs
 * listing different entities with different rules.
 */
export const RELATED_RELATIONS: Readonly<Record<string, RelatedRelation>> = {
    // q searches project text on this page already, so everything carries.
    'projects:works': {carry: [...ALWAYS, SEARCH_PARAM.query], omit: {}},
    'projects:organisations': {
        carry: [...ALWAYS],
        omit: {
            [SEARCH_PARAM.query]: 'it searches project text, not organisation names',
        },
    },

    // q is an organisation NAME search here.
    // Group 2: ORG_FIELDS is names only, so this really is a name search.
    'organisations:projects': {
        carry: [...ALWAYS, ...PROJECT_FILTER_PARAMS],
        omit: {[SEARCH_PARAM.query]: 'it searches organisation names, not the text of projects'},
    },
    'organisations:works': {
        carry: [...ALWAYS],
        omit: {[SEARCH_PARAM.query]: 'it searches organisation names, not works'},
    },

    // The minorities search is two-step (query/minorities.ts probes the
    // projects index), so a group listed for a research subject was listed
    // because of its projects — group 1.
    'minorities:projects': {carry: [...ALWAYS, SEARCH_PARAM.query, ...PROJECT_FILTER_PARAMS], omit: {}},
    // Works are linked to a group only through a project, and the group may
    // equally have matched by NAME; filtering its works by "Sami" would empty
    // the list for a reason the user cannot see.
    'minorities:works': {
        carry: [...ALWAYS],
        omit: {[SEARCH_PARAM.query]: 'it may have matched this group’s name rather than the text of its works'},
    },
    'minorities:organisations': {
        carry: [...ALWAYS],
        omit: {[SEARCH_PARAM.query]: 'it may have matched this group’s name rather than anything about these organisations'},
    },

    // Group 1. The grants search finds a stream either by its own description
    // or by the projects it funded, so both tabs narrow to the matching
    // projects — the organisations tab aggregates over exactly that set.
    'grants:projects': {carry: [...ALWAYS, SEARCH_PARAM.query, ...PROJECT_FILTER_PARAMS], omit: {}},
    'grants:organisations': {carry: [...ALWAYS, SEARCH_PARAM.query], omit: {}},

    // Group 1, and always were.
    'experts:projects': {carry: [...ALWAYS, SEARCH_PARAM.query, ...PROJECT_FILTER_PARAMS], omit: {}},
    'experts:works': {carry: [...ALWAYS, SEARCH_PARAM.query], omit: {}},
    'funding:projects': {carry: [...ALWAYS, SEARCH_PARAM.query, ...PROJECT_FILTER_PARAMS, SEARCH_PARAM.stream], omit: {}},

    // The organisation network. The page is centred on ONE organisation, so
    // the text search means nothing there; the corpus and the project filters
    // narrow the network AND the project lists inside it (the same string).
    'collaboration:projects': {
        carry: [
            ...ALWAYS,
            SEARCH_PARAM.years,
            SEARCH_PARAM.funder,
            SEARCH_PARAM.programme,
            SEARCH_PARAM.topic,
            SEARCH_PARAM.subfield,
            SEARCH_PARAM.field,
        ],
        omit: {[SEARCH_PARAM.query]: 'the network is centred on one organisation, not a text search'},
    },

    'works:projects': {
        carry: [...ALWAYS],
        omit: {[SEARCH_PARAM.query]: 'it searches work text, not projects'},
    },
    'works:organisations': {
        carry: [...ALWAYS],
        omit: {[SEARCH_PARAM.query]: 'it searches work text, not organisations'},
    },
}

/**
 * The page's params, narrowed to the ones this relation carries.
 *
 * Returns a plain `URLSearchParams` so a caller can add its own (`page`, the
 * owning id) without this function knowing about either.
 */
export function relatedParams(relation: string, params: URLSearchParams): URLSearchParams {
    const config = RELATED_RELATIONS[relation]
    const next = new URLSearchParams()
    if (!config) return next

    for (const name of config.carry) {
        for (const value of params.getAll(name)) {
            if (value !== '') next.append(name, value)
        }
    }
    return next
}

/**
 * What carrying `q` means for each list, in the user's terms. Without this the
 * caption says "Filtered by: Search text", which is true and useless.
 */
const QUERY_MEANING: Readonly<Record<string, string>> = {
    'grants:projects': 'projects of this stream that match it',
    'grants:organisations': 'organisations on this stream’s matching projects',
    'minorities:projects': 'projects about this group that match it',
    'experts:projects': 'projects of this organisation that match it',
    'experts:works': 'works of this organisation that match it',
    'funding:projects': 'projects of this organisation that match it',
    'projects:works': 'works of this project that match it',
}

export interface RelatedCaptionOptions {
    /** Turns a raw value into something readable — a topic id into its name. */
    labelValue?: (param: string, value: string) => string
    /** Human names for params; defaults to the raw name. */
    labelParam?: (param: string) => string
}

/**
 * One grey line above a tab list saying what it is filtered by, and what of
 * the page was deliberately left out and why.
 *
 * Generated from the same table the request is built from, so the sentence can
 * never drift from the behaviour it describes.
 */
export function relatedFilterCaption(relation: string, params: URLSearchParams, options: RelatedCaptionOptions = {}): string {
    const config = RELATED_RELATIONS[relation]
    if (!config) return ''

    const labelParam = options.labelParam ?? ((param: string) => param)
    const labelValue = options.labelValue ?? ((_param: string, value: string) => value)

    const applied = config.carry
        .flatMap((name) => {
            const values = params.getAll(name).filter((value) => value !== '')
            if (values.length === 0) return []
            // The query needs spelling out: "Search text virtual reality" does
            // not tell anyone WHAT was narrowed by it.
            if (name === SEARCH_PARAM.query) {
                return [`your search text (${QUERY_MEANING[relation] ?? 'entries matching it'})`]
            }
            return [`${labelParam(name)} ${values.map((value) => labelValue(name, value)).join(', ')}`]
        })
        .join('; ')

    const ignored = Object.entries(config.omit)
        .filter(([name]) => params.getAll(name).some((value) => value !== ''))
        .map(([name, reason]) => `${labelParam(name)} is not applied: ${reason}`)
        .join('; ')

    return [applied ? `Filtered by: ${applied}.` : '', ignored ? `${ignored}.` : ''].filter(Boolean).join(' ')
}
