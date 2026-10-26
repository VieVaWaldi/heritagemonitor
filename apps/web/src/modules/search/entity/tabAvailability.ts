// Which tabs of a detail panel exist for the selected document.
//
// A tab whose list is EMPTY FOR EVERY USER of that document is noise: a work
// with no linked project should not offer a "Projects" tab. But a list that is
// merely empty because of the page's filters must keep its tab, because the
// gold caption above it is what explains why it is empty. So the rule is about
// the document, not the filters: a tab hides only when the document's own
// rollup says there is nothing at all (`work_count === 0`, no subgroups, ...).
//
// Decided from fields already on the selected document — no request per tab.
// A missing (null/undefined) figure means "unknown", not zero: the tab stays.
// While the document is still loading, nothing hides.
//
// Pure and free of React and `@/` aliases so every rule is unit-tested (see
// test/tabAvailability.test.ts); the hook that applies it lives in
// useAvailableTab.ts.

/** True only for a KNOWN zero. */
const none = (count: number | null | undefined): boolean => count === 0

/** The tabs of `all` that stay, in order. The first one (the overview) is never hidden. */
export function availableTabs<T extends string>(all: readonly T[], hidden: readonly string[]): T[] {
    return all.filter((tab, index) => index === 0 || !hidden.includes(tab))
}

/**
 * The tab to show: the requested one when it exists, else the first available.
 * `rewrite` says the URL named a tab that is hidden for this document and must
 * be corrected (no stale state).
 */
export function resolveTab<T extends string>(requested: T, available: readonly T[]): {tab: T; rewrite: boolean} {
    return available.includes(requested) ? {tab: requested, rewrite: false} : {tab: available[0] ?? requested, rewrite: true}
}

/** The visible tabs of a TabbedPanel, in the panel's own order. */
export function visibleTabs<TTab extends {value: string}>(tabs: readonly TTab[], available: readonly string[]): TTab[] {
    return tabs.filter((tab) => available.includes(tab.value))
}

// --- per entity: which tabs a document can hide, and by which field ----------

/** Project: organisations by `org_count`, works by `work_count`. */
export function projectHiddenTabs(project: {org_count?: number | null; work_count?: number | null} | null): string[] {
    if (!project) return []
    return [...(none(project.org_count) ? ['organisations'] : []), ...(none(project.work_count) ? ['works'] : [])]
}

/** Organisation (and the experts page, whose detail IS an organisation): projects by `project_count`, works by `work_count`. */
export function organisationHiddenTabs(organisation: {project_count?: number | null; work_count?: number | null} | null): string[] {
    if (!organisation) return []
    return [...(none(organisation.project_count) ? ['projects'] : []), ...(none(organisation.work_count) ? ['works'] : [])]
}

/**
 * Work: projects by `project_ids` (always present on the detail, so an empty
 * list is a real zero), organisations by `org_count` — the true number, since
 * `organisation_ids` is capped; with no count, an empty id list.
 */
export function workHiddenTabs(work: {project_ids?: readonly string[]; org_count?: number | null; organisation_ids?: readonly string[]} | null): string[] {
    if (!work) return []
    const noOrganisations = work.org_count != null ? work.org_count === 0 : work.organisation_ids !== undefined && work.organisation_ids.length === 0
    return [...(work.project_ids !== undefined && work.project_ids.length === 0 ? ['projects'] : []), ...(noOrganisations ? ['organisations'] : [])]
}

/**
 * Grant (funding stream): projects by `project_count`. Its organisations are
 * derived from those projects, so a stream with no project has none either.
 */
export function grantHiddenTabs(grant: {project_count?: number | null} | null): string[] {
    if (!grant) return []
    return none(grant.project_count) ? ['projects', 'organisations'] : []
}

/**
 * Minority group: subgroups by `known_subgroups`, projects/works/organisations
 * by `project_count`/`work_count`/`org_count`, topics by `topic_ids` and
 * `topic_counts`. Funders have no rollup of their own — they come from the
 * group's projects — so they hide with `project_count === 0`.
 */
export function minorityHiddenTabs(
    group: {
        known_subgroups?: readonly unknown[]
        project_count?: number | null
        work_count?: number | null
        org_count?: number | null
        topic_ids?: readonly string[]
        topic_counts?: readonly unknown[]
    } | null,
): string[] {
    if (!group) return []
    const hidden: string[] = []
    if (group.known_subgroups !== undefined && group.known_subgroups.length === 0) hidden.push('subgroups')
    if (none(group.project_count)) hidden.push('projects', 'funding')
    if (none(group.work_count)) hidden.push('works')
    if (none(group.org_count)) hidden.push('organisations')
    if (group.topic_ids !== undefined && group.topic_ids.length === 0 && (group.topic_counts?.length ?? 0) === 0) hidden.push('topics')
    return hidden
}

/**
 * Organisation network: the centre's own Projects tab, by the centre's
 * `project_count` (its record; the network payload only knows the projects
 * under the current filters, which would hide the tab for the wrong reason).
 */
export function organisationNetworkHiddenTabs(centre: {project_count?: number | null} | null): string[] {
    if (!centre) return []
    return none(centre.project_count) ? ['projects'] : []
}

/**
 * Query network (cluster view): a cluster's Projects tab by the number of
 * projects assigned to it (0 = none of the scanned projects belong to it), the
 * global Bridges tab when the network has no hinge organisation and no bridge
 * project at all. Organisations never hides (a cluster has at least two
 * members); Overview and Graph are always there.
 */
export function queryNetworkHiddenTabs(state: {clusterProjects: number | null; hinges: number; hingeProjects: number} | null): string[] {
    if (!state) return []
    return [
        ...(state.clusterProjects === 0 ? ['projects'] : []),
        ...(state.hinges === 0 && state.hingeProjects === 0 ? ['bridges'] : []),
    ]
}

// Funding hides nothing, on purpose: its tabs (the map, the organisation
// overview, the programmes browser) are not lists of the selected document.
