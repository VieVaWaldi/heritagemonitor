// The api paths behind every "list belonging to the open document" tab.
//
// One place, shared by the tab hooks (which fetch them while a tab is open)
// and by Lucy's lazy context (which fetches page 1 of the same lists at
// chat-send time, see relatedContext.ts). If the two built their own paths
// they would drift, and Lucy would describe a list the user is not seeing.
// Free of React and `@/` aliases so it can be unit-tested.

const enc = encodeURIComponent

/** `search` is the already-built forwarded query string (see relatedParams); may be empty. */
export const relatedPaths = {
    projectOrganisations: (projectId: string, page: number) => `/v1/projects/${enc(projectId)}/organisations?page=${page}`,

    /** A project's or an organisation's works. */
    works: (entity: 'projects' | 'organisations', id: string, page: number, search = '') =>
        `/v1/${entity}/${enc(id)}/works?page=${page}&${search}`,

    organisationProjects: (organisationId: string, page: number, search = '') =>
        `/v1/organisations/${enc(organisationId)}/projects?page=${page}&${search}`,

    workProjects: (workId: string, page: number) => `/v1/works/${enc(workId)}/projects?page=${page}`,
    workOrganisations: (workId: string, page: number) => `/v1/works/${enc(workId)}/organisations?page=${page}`,

    /** A stream's projects are the projects search narrowed by `stream`. */
    grantProjects: (grantId: string, corpus: string | undefined, page: number, search = '') => {
        const query = new URLSearchParams(search)
        query.set('stream', grantId)
        query.set('page', String(page))
        if (corpus) query.set('c', corpus)
        return `/v1/projects/search?${query.toString()}`
    },
    grantOrganisations: (grantId: string, corpus: string | undefined, search = '') => {
        const query = new URLSearchParams(search)
        if (corpus) query.set('c', corpus)
        const suffix = query.toString() ? `?${query.toString()}` : ''
        return `/v1/grants/${enc(grantId)}/organisations${suffix}`
    },

    minorityProjects: (qid: string, page: number, search = '') => `/v1/projects/search?minority=${enc(qid)}&page=${page}&${search}`,
    minorityWorks: (qid: string, page: number, search = '') => `/v1/works/search?minority=${enc(qid)}&page=${page}&${search}`,
    minorityOrganisations: (qid: string, page: number, search = '') =>
        `/v1/minorities/${enc(qid)}/organisations?page=${page}&${search}`,

    /** An expert's matching projects: the page's own query and filters plus `org`. */
    expertProjects: (apiParams: string, organisationId: string, page: number) =>
        `/v1/projects/search?${apiParams}&org=${enc(organisationId)}&page=${page}`,
    /** An expert's works, by default narrowed to the page's text (see ExpertsResultsPanel). */
    expertWorks: (organisationId: string, page: number, corpus: string, query: string) =>
        `/v1/organisations/${enc(organisationId)}/works?page=${page}&c=${enc(corpus)}` + (query ? `&q=${enc(query)}` : ''),
}
