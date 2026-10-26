import {
    bestFetchableSource,
    grantOrganisationsResponseSchema,
    httpUrlOrNull,
    organisationProjectsResponseSchema,
    projectLinks,
    projectOrganisationsResponseSchema,
    projectSearchResponseSchema,
    workLinks,
    workOrganisationsResponseSchema,
    workProjectsResponseSchema,
    workSearchResponseSchema,
    type OrganisationRow,
    type ProjectOrganisation,
    type ProjectRow,
    type WorkRow,
} from '@heritagemonitor/shared'
import {apiGet} from '@/common/api/apiClient'
import {
    MAX_FETCHES,
    type PageContextLazy,
    type PageContextSection,
    type PageContextSource,
} from '@/common/llmchat/pageContext'
import {summarizeOrganisationRow} from '../organisations/organisationsChatContext'
import {organisationName} from '../organisations/organisationFormat'
import {formatGrantFunding} from '../grants/grantFormat'
import {projectHeadline} from '../projects/projectFormat'
import {summarizeProjectOrganisation, summarizeProjectRow} from '../projects/projectsChatContext'
import {summarizeWorkRow} from '../works/worksChatContext'
import {workTitle} from '../works/workFormat'
import {relatedPaths} from './relatedPaths'

// Lucy sees the related lists of the SELECTED entity even when their tab is
// not open. Fetched lazily, at chat-send time (see resolvePageContext), so
// browsing costs nothing: page 1 of each list, the first few rows, through the
// SAME paths (relatedPaths) and the SAME forwarded filters (relatedParams) the
// tabs use — so what she is told is what the tab would show.

/** Rows per list. A list row is ~300 characters; three lists stay well inside the context budget. */
export const RELATED_ROWS_PER_LIST = 12

interface LoadedList {
    total: number
    rows: string[]
    sources: PageContextSource[]
}

export interface RelatedListSpec {
    /** The detail-panel tab this list belongs to: a hidden tab's list is skipped (see tabAvailability). */
    tab: string
    /** e.g. "Works of this project". */
    title: string
    path: string
    load: (signal: AbortSignal) => Promise<LoadedList>
}

/** "- [id] Title (…)" becomes "- Project [id] Title (…)": each entry says what it is. */
function labelled(noun: string, row: string): string {
    return row.startsWith('- ') ? `- ${noun} ${row.slice(2)}` : `- ${noun} ${row}`
}

interface HitsResponse<T> {
    hits: T[]
    estimatedTotalHits: number
}

function hitsList<T>(options: {
    title: string
    path: string
    noun: string
    /** Overrides the tab the list belongs to (default: the plural of `noun`). */
    tab?: string
    schema: {parse(data: unknown): HitsResponse<T>}
    summarize: (row: T) => string
    /** The best fetchable link of a row, with the label shown in brackets. */
    source: (row: T) => {label: string; url: string} | null
}): RelatedListSpec {
    return {
        tab: options.tab ?? `${options.noun.toLowerCase()}s`,
        title: options.title,
        path: options.path,
        load: async (signal) => {
            const response = await apiGet(options.path, options.schema, {signal})
            const hits = response.hits.slice(0, RELATED_ROWS_PER_LIST)
            return {
                total: response.estimatedTotalHits,
                rows: hits.map((row) => labelled(options.noun, options.summarize(row))),
                sources: hits.flatMap((row) => {
                    const source = options.source(row)
                    return source ? [source] : []
                }),
            }
        },
    }
}

// --- the three row kinds ----------------------------------------------------

export const projectsOf = (title: string, path: string, schema: {parse(data: unknown): HitsResponse<ProjectRow>}, tab?: string) =>
    hitsList<ProjectRow>({
        tab,
        title,
        path,
        noun: 'Project',
        schema,
        summarize: summarizeProjectRow,
        source: (row) => {
            const best = bestFetchableSource(projectLinks(row))
            return best ? {label: `Project: ${projectHeadline(row)} (${best.label})`, url: best.url} : null
        },
    })

const worksOf = (title: string, path: string, schema: {parse(data: unknown): HitsResponse<WorkRow>} = workSearchResponseSchema) =>
    hitsList<WorkRow>({
        title,
        path,
        noun: 'Work',
        schema,
        summarize: summarizeWorkRow,
        source: (row) => {
            const best = bestFetchableSource(workLinks(row))
            return best ? {label: `Work: ${workTitle(row)} (${best.label})`, url: best.url} : null
        },
    })

const organisationsOf = (title: string, path: string, schema: {parse(data: unknown): HitsResponse<OrganisationRow>}) =>
    hitsList<OrganisationRow>({
        title,
        path,
        noun: 'Organisation',
        schema,
        summarize: summarizeOrganisationRow,
        source: (row) => {
            const website = httpUrlOrNull(row.websiteUrl)
            return website ? {label: `Organisation: ${organisationName(row)} (website)`, url: website} : null
        },
    })

// --- per selected entity ----------------------------------------------------

export function projectRelatedLists(projectId: string, worksSearch: string): RelatedListSpec[] {
    return [
        hitsList<ProjectOrganisation>({
            title: 'Organisations of this project, coordinators first',
            path: relatedPaths.projectOrganisations(projectId, 1),
            noun: 'Organisation',
            schema: projectOrganisationsResponseSchema,
            summarize: summarizeProjectOrganisation,
            source: (row) => {
                const website = httpUrlOrNull(row.websiteUrl)
                return website ? {label: `Organisation: ${row.legalName ?? row.id} (website)`, url: website} : null
            },
        }),
        worksOf('Works of this project, most cited first', relatedPaths.works('projects', projectId, 1, worksSearch)),
    ]
}

export function organisationRelatedLists(organisationId: string, projectsSearch: string, worksSearch: string): RelatedListSpec[] {
    return [
        projectsOf('Projects of this organisation', relatedPaths.organisationProjects(organisationId, 1, projectsSearch), organisationProjectsResponseSchema),
        worksOf('Works of this organisation, most cited first', relatedPaths.works('organisations', organisationId, 1, worksSearch)),
    ]
}

export function workRelatedLists(workId: string): RelatedListSpec[] {
    return [
        projectsOf('Projects linked to this work', relatedPaths.workProjects(workId, 1), workProjectsResponseSchema),
        organisationsOf('Organisations that produced this work', relatedPaths.workOrganisations(workId, 1), workOrganisationsResponseSchema),
    ]
}

export function grantRelatedLists(grantId: string, corpus: string | undefined, projectsSearch: string, organisationsSearch: string): RelatedListSpec[] {
    const organisationsPath = relatedPaths.grantOrganisations(grantId, corpus, organisationsSearch)
    return [
        projectsOf('Projects funded by this stream', relatedPaths.grantProjects(grantId, corpus, 1, projectsSearch), projectSearchResponseSchema),
        {
            tab: 'organisations',
            title: 'Organisations most involved in this stream (the EUR figure is each organisation\'s lifetime total, not this stream\'s)',
            path: organisationsPath,
            load: async (signal) => {
                const response = await apiGet(organisationsPath, grantOrganisationsResponseSchema, {signal})
                const organisations = response.organisations.slice(0, RELATED_ROWS_PER_LIST)
                return {
                    total: response.organisations.length,
                    rows: organisations.map(
                        (organisation) =>
                            `- Organisation [${organisation.id}] ${organisation.name} (${[organisation.country, `${organisation.projects} projects in this stream`, formatGrantFunding(organisation.total_funding_eur)].filter(Boolean).join(', ')})`,
                    ),
                    sources: [],
                }
            },
        },
    ]
}

export function minorityRelatedLists(qid: string, projectsSearch: string, worksSearch: string, organisationsSearch: string): RelatedListSpec[] {
    return [
        projectsOf('Projects that mention this group', relatedPaths.minorityProjects(qid, 1, projectsSearch), projectSearchResponseSchema),
        worksOf('Works tagged with this group via their linked project', relatedPaths.minorityWorks(qid, 1, worksSearch)),
        organisationsOf('Organisations that worked on this group\'s projects', relatedPaths.minorityOrganisations(qid, 1, organisationsSearch), workOrganisationsResponseSchema),
    ]
}

export function expertRelatedLists(options: {apiParams: string; organisationId: string; corpus: string; worksQuery: string}): RelatedListSpec[] {
    return [
        projectsOf('Matching projects of this organisation', relatedPaths.expertProjects(options.apiParams, options.organisationId, 1), projectSearchResponseSchema),
        worksOf('Works of this organisation', relatedPaths.expertWorks(options.organisationId, 1, options.corpus, options.worksQuery)),
    ]
}

// --- the lazy context -------------------------------------------------------

/** What Lucy is told about the lists below, once, so she reads them right. */
function preface(entityNoun: string): PageContextSection {
    return {
        heading:
            `Related lists of the SELECTED ${entityNoun}, loaded now although their tabs may not be open. Page 1 only, at most ${RELATED_ROWS_PER_LIST} rows per list. ` +
            'Every entry starts with what it is (Project, Work or Organisation) and its id. ' +
            `Their links are among your offered sources, labelled the same way. You can fetch at most ${MAX_FETCHES} URLs per answer, so pick the most relevant ones.`,
        rows: [],
    }
}

/**
 * The lazy part of a page context: the selected entity's related lists.
 * `key` is the list of requests, so it changes exactly when a different
 * request would be made (another row, another filter, another corpus).
 */
export function relatedLazyContext(entityNoun: string, allLists: RelatedListSpec[], hiddenTabs: readonly string[] = []): PageContextLazy {
    // A tab that is hidden for this document has no list to show — and nothing
    // to fetch: Lucy is not told about lists the user cannot see.
    const lists = allLists.filter((list) => !hiddenTabs.includes(list.tab))
    return {
        key: lists.map((list) => list.path).join('|'),
        load: async (signal) => {
            const settled = await Promise.allSettled(lists.map((list) => list.load(signal)))
            const sections: PageContextSection[] = [preface(entityNoun)]
            const sources: PageContextSource[] = []
            settled.forEach((result, index) => {
                const list = lists[index]
                if (result.status === 'rejected') {
                    sections.push({heading: `${list.title}: could not be loaded right now.`, rows: []})
                    return
                }
                sections.push({
                    heading: `${list.title} (${result.value.total} in total, showing ${result.value.rows.length}):`,
                    rows: result.value.rows,
                })
                sources.push(...result.value.sources)
            })
            return {sections, sources}
        },
    }
}
