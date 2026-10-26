import {projectSearchResponseSchema, type NetworkNode, type OrganisationNetworkResponse} from '@heritagemonitor/shared'
import type {PageContextLazy, PageContextSection} from '@/common/llmchat/pageContext'
import {projectsOf, relatedLazyContext, type RelatedListSpec} from '../entity/relatedContext'
import {centreProjectsPath, formatShared, partnerChatRow, sharedProjectsPath} from './networkAdapter'

// What Lucy is told about the organisation network. Kept out of the panel
// (apps/web/RULES.md #7) and out of common/llmchat.

/** Partner rows listed in the context — the strongest ones; the rest are on the page. */
const CONTEXT_PARTNER_ROWS = 20

/** Said once, honestly: the picture is a lower bound, not the whole world. */
export const NETWORK_COVERAGE_NOTE =
    'Only organisations with coordinates (about one in five) can be drawn, and the projects are mostly European, so the network shows a part of the real collaborations.'

export function networkStateSection(options: {
    centre: NetworkNode
    network: OrganisationNetworkResponse
    corpusName: string
    urlParams: string
}): PageContextSection {
    const {centre, network, corpusName, urlParams} = options
    const {partners, withoutGeo, capped} = network.meta
    const listed = network.nodes.slice(1, 1 + CONTEXT_PARTNER_ROWS)

    return {
        heading: [
            `The organisation network of ${centre.name} (id ${centre.id}): its partners are the organisations that shared a project with it, ranked by shared projects. It has ${centre.w.toLocaleString('en-US')} projects under the current filters.`,
            `Corpus: ${corpusName}.`,
            `${partners} partner organisation${partners === 1 ? '' : 's'} found${capped ? ' (the list is capped at the strongest ones)' : ''}; ${withoutGeo} of them have no location and are neither drawn nor listed.`,
            NETWORK_COVERAGE_NOTE,
            `Active URL parameters: ${urlParams}.`,
            `The strongest partners (${listed.length} of ${network.nodes.length - 1} drawn):`,
        ].join(' '),
        rows: listed.map(partnerChatRow),
    }
}

export function selectedPairLine(centre: NetworkNode, partner: NetworkNode): string {
    return `Selected pair: ${centre.name} ↔ ${partner.name}, ${formatShared(partner.w)}.`
}

/**
 * The shared projects of the selected pair and the centre's own projects,
 * fetched when a message is sent (see resolvePageContext) — their links are
 * the sources Lucy may fetch, through the same direct-host rule as everywhere.
 */
export function networkLazyContext(options: {centre: NetworkNode; partner: NetworkNode | null; filterQuery: string; hiddenTabs?: readonly string[]}): PageContextLazy {
    const {centre, partner, filterQuery, hiddenTabs} = options
    const lists: RelatedListSpec[] = [
        ...(partner && partner.id !== centre.id
            ? [projectsOf(`Projects that link ${centre.name} and ${partner.name}`, sharedProjectsPath(centre.id, partner.ids, 1, filterQuery), projectSearchResponseSchema, 'detail')]
            : []),
        projectsOf(`Projects of ${centre.name}`, centreProjectsPath(centre.id, 1, filterQuery), projectSearchResponseSchema),
    ]
    return relatedLazyContext('organisation network', lists, hiddenTabs)
}
