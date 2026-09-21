// What each facet is actually filtering, in words.
//
// A bare "Topic" above a checkbox list is ambiguous on half of these pages:
// on the minorities page a topic filters the GROUPS by what their projects are
// about, on the experts page it filters ORGANISATIONS by the projects they
// ran, and on the projects page it filters the projects themselves. The column
// looked identical in all three. So every facet card is titled with the thing
// being filtered and how — "Groups with projects on: Topic".
//
// One place, keyed by page, because these phrases have to agree with each
// other: if a new page invents its own wording the column stops being
// readable as a family.

export interface FacetTitleConfig {
    /** Applies to every facet of the page. */
    subject: string
    /**
     * Per-param exceptions, for facets that filter by something OTHER than the
     * page's own entity — a minority group's topics belong to its projects,
     * not to the group.
     */
    overrides?: Readonly<Record<string, string>>
}

/** Keyed by the page's own key: an entity on `/search`, or a use case elsewhere. */
export const FACET_TITLES: Readonly<Record<string, FacetTitleConfig>> = {
    projects: {subject: 'Projects matching'},
    organisations: {subject: 'Organisations with'},
    works: {subject: 'Works matching'},
    grants: {subject: 'Funding streams with'},
    minorities: {
        subject: 'Groups with',
        // Country/religion/language are properties of the group; topic is a
        // property of the projects about it.
        overrides: {topic: 'Groups with projects on'},
    },
    experts: {subject: 'Organisations with projects matching'},
    funding: {subject: 'Organisations funded by projects matching'},
}

/**
 * The card heading for one facet, e.g. "Projects matching: Topic".
 *
 * Falls back to the bare facet label for a page with no entry rather than
 * inventing a subject — a wrong description is worse than none.
 */
export function facetTitle(pageKey: string, param: string, label: string): string {
    const config = FACET_TITLES[pageKey]
    if (!config) return label
    return `${config.overrides?.[param] ?? config.subject}: ${label}`
}
