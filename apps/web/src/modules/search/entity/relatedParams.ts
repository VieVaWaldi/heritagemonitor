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
// But carrying EVERY param is just as wrong, and in one specific way that bit
// us: `q` means different things on different pages. On the minorities,
// organisations and grants pages `q` searches the NAME of the listed entity
// ("Sami", "Fraunhofer", "ERASMUS+"); passing it to a projects list would ask
// the projects index for projects whose text matches an organisation's name
// and return nothing. On the experts and funding pages `q` is already a
// subject search over projects, so there it must carry.
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
    'organisations:projects': {
        carry: [...ALWAYS, ...PROJECT_FILTER_PARAMS],
        omit: {[SEARCH_PARAM.query]: 'it searches organisation names, not projects'},
    },
    'organisations:works': {
        carry: [...ALWAYS],
        omit: {[SEARCH_PARAM.query]: 'it searches organisation names, not works'},
    },

    // q is a group NAME search here; its topic filter is about the projects,
    // so it carries into a projects list.
    'minorities:projects': {
        carry: [...ALWAYS, ...PROJECT_FILTER_PARAMS],
        omit: {[SEARCH_PARAM.query]: 'it searches group names, not projects'},
    },
    'minorities:works': {
        carry: [...ALWAYS],
        omit: {[SEARCH_PARAM.query]: 'it searches group names, not works'},
    },
    'minorities:organisations': {
        carry: [...ALWAYS],
        omit: {[SEARCH_PARAM.query]: 'it searches group names, not organisations'},
    },

    // q is a stream NAME/description search here.
    'grants:projects': {
        carry: [...ALWAYS, ...PROJECT_FILTER_PARAMS],
        omit: {[SEARCH_PARAM.query]: 'it searches funding-stream names, not projects'},
    },
    'grants:organisations': {
        carry: [...ALWAYS],
        omit: {[SEARCH_PARAM.query]: 'it searches funding-stream names, not organisations'},
    },

    // q IS a subject search over projects on both of these.
    'experts:projects': {carry: [...ALWAYS, SEARCH_PARAM.query, ...PROJECT_FILTER_PARAMS], omit: {}},
    'experts:works': {carry: [...ALWAYS, SEARCH_PARAM.query], omit: {}},
    'funding:projects': {carry: [...ALWAYS, SEARCH_PARAM.query, ...PROJECT_FILTER_PARAMS, SEARCH_PARAM.stream], omit: {}},

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
            return [`${labelParam(name)} ${values.map((value) => labelValue(name, value)).join(', ')}`]
        })
        .join('; ')

    const ignored = Object.entries(config.omit)
        .filter(([name]) => params.getAll(name).some((value) => value !== ''))
        .map(([name, reason]) => `${labelParam(name)} is not applied: ${reason}`)
        .join('; ')

    return [applied ? `Filtered by: ${applied}.` : '', ignored ? `${ignored}.` : ''].filter(Boolean).join(' ')
}
