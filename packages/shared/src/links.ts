// The one place that derives outbound links from indexed fields. Used by the
// web overview panels (rendered as real <a> links) and by the chat context
// (the same URLs become Lucy's approved fetch targets), so a project's links
// can never disagree between the two. Lives in shared, not apps/web, because
// the derivation rules are data rules (which funder/programme has which
// external registry), not presentation.

export interface ExternalLink {
    label: string
    url: string
}

/**
 * Only http(s) is ever rendered as a link, or handed to Lucy as a fetchable
 * source: these values come from upstream data dumps, and an href is enough
 * for a `javascript:`/`data:` URL to matter. Exported because every place
 * that turns stored data into a link needs the same guard.
 */
export function httpUrlOrNull(value: string | null | undefined): string | null {
    if (!value) return null
    const trimmed = value.trim()
    if (!trimmed) return null
    let parsed: URL
    try {
        parsed = new URL(trimmed)
    } catch {
        return null
    }
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null
}

// Accepts what the sources actually store: a bare `10.3030/689660`, a
// `doi:`-prefixed one, or an already-resolved doi.org URL.
function normalizeDoi(doi: string | null | undefined): string | null {
    if (!doi) return null
    const trimmed = doi.trim().replace(/^doi:/i, '').replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    // A DOI always starts with the `10.<registrant>/` prefix; anything else in
    // that column is junk we don't turn into a dead link.
    return /^10\.\d{4,9}\/\S+$/.test(trimmed) ? trimmed : null
}

// CORDIS only covers the EC's own framework programmes. ERASMUS+ is EC-funded
// too but its grant ids are call references ("2019-1-EE01-KA229-051616"), not
// CORDIS project ids — hence the numeric check below on top of this list.
const CORDIS_PROGRAMMES = new Set(['FP7', 'H2020', 'HE'])
const EC_FUNDER = 'EC'

export interface ProjectLinkFields {
    doi?: string | null
    grantId?: string | null
    /** `funder` and `programme` are multi-valued on the index (a project can carry several). */
    funder?: readonly string[] | null
    programme?: readonly string[] | null
    openaireId?: string | null
    websiteUrl?: string | null
}

/**
 * Outbound links for one project, in the order they should be shown.
 *
 * - **DOI** for every project that has one, EC or not (H2020/HE carry
 *   `10.3030/<grantId>`, which redirects to CORDIS; FP7 has none, NIH/FWF/...
 *   have their own).
 * - **CORDIS** only for an EC project of FP7/H2020/HE with a numeric grant id
 *   — the one derived link, and the only way to reach an FP7 project, where
 *   doi.org would 404.
 * - **OpenAIRE** and **Website** whenever the fields are present.
 */
export function projectLinks(project: ProjectLinkFields): ExternalLink[] {
    const links: ExternalLink[] = []

    const doi = normalizeDoi(project.doi)
    if (doi) links.push({label: 'DOI', url: `https://doi.org/${encodeURI(doi)}`})

    const grantId = project.grantId?.trim() ?? ''
    const isEc = project.funder?.includes(EC_FUNDER) ?? false
    const isCordisProgramme = project.programme?.some((programme) => CORDIS_PROGRAMMES.has(programme)) ?? false
    if (isEc && isCordisProgramme && /^\d+$/.test(grantId)) {
        links.push({label: 'CORDIS', url: `https://cordis.europa.eu/project/id/${grantId}`})
    }

    const openaireId = project.openaireId?.trim()
    if (openaireId) {
        links.push({
            label: 'OpenAIRE',
            url: `https://explore.openaire.eu/search/project?projectId=${encodeURIComponent(openaireId)}`,
        })
    }

    const websiteUrl = httpUrlOrNull(project.websiteUrl)
    if (websiteUrl) links.push({label: 'Website', url: websiteUrl})

    return links
}

export interface OrganisationLinkFields {
    rorId?: string | null
    websiteUrl?: string | null
    openaireId?: string | null
    wikiId?: string | null
}

/**
 * Outbound links for one organisation. ROR is the canonical identifier for
 * research institutions and is stored bare (`04k9mqs81`) or already as a URL,
 * so both forms are normalised here.
 */
export function organisationLinks(organisation: OrganisationLinkFields): ExternalLink[] {
    const links: ExternalLink[] = []

    const rorId = organisation.rorId?.trim().replace(/^https?:\/\/ror\.org\//iu, '')
    if (rorId) links.push({label: 'ROR', url: `https://ror.org/${encodeURIComponent(rorId)}`})

    const website = httpUrlOrNull(organisation.websiteUrl)
    if (website) links.push({label: 'Website', url: website})

    const openaireId = organisation.openaireId?.trim()
    if (openaireId) {
        links.push({
            label: 'OpenAIRE',
            url: `https://explore.openaire.eu/search/organization?organizationId=${encodeURIComponent(openaireId)}`,
        })
    }

    const wikiId = organisation.wikiId?.trim()
    if (wikiId) links.push({label: 'Wikidata', url: `https://www.wikidata.org/wiki/${encodeURIComponent(wikiId)}`})

    return links
}
