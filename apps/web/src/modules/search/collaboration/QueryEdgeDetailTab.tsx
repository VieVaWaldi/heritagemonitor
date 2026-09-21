'use client'

import type {OrganisationDetail, ProjectSearchResponse} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import {Text} from '@/common/text'
import {RelatedList, type RelatedRow} from '../entity/RelatedList'
import {OrganisationOverviewTab} from '../organisations/OrganisationOverviewTab'
import {formatShared} from './networkAdapter'
import type {QueryEdge} from './queryNetworkAdapter'

export interface QueryEdgeDetailTabProps {
    edge: QueryEdge
    detailA: OrganisationDetail | null
    detailB: OrganisationDetail | null
    shared: ProjectSearchResponse
    page: number
    onPageChange: (page: number) => void
    loading: boolean
    /** Which of the page's filters narrowed the shared list — see relatedParams. */
    filterCaption: string
    onSelectProject: (id: string) => void
}

function projectRow(project: ProjectSearchResponse['hits'][number]): RelatedRow {
    return {
        id: project.id,
        primary: project.acronym && project.title ? `${project.acronym} — ${project.title}` : (project.title ?? project.acronym ?? project.id),
        secondary: [project.year != null ? String(project.year) : null, [...project.funder, ...project.programme].join(' / ') || null]
            .filter(Boolean)
            .join(' · '),
    }
}

function OrganisationSection({name, detail}: {name: string; detail: OrganisationDetail | null}) {
    return (
        <Box sx={{borderTop: 1, borderColor: 'divider'}}>
            <Text variant="overline" color="text.secondary" sx={{fontWeight: 600, display: 'block', px: 2.5, pt: 2}}>
                {name}
            </Text>
            {detail ? (
                <OrganisationOverviewTab organisation={detail} />
            ) : (
                <Box sx={{p: 2.5}}>
                    <Text variant="body2" color="text.secondary">
                        Loading the organisation…
                    </Text>
                </Box>
            )}
        </Box>
    )
}

/**
 * The second tab: the selected collaboration — the projects that link the two
 * organisations, then both organisations' overviews.
 */
export function QueryEdgeDetailTab({edge, detailA, detailB, shared, page, onPageChange, loading, filterCaption, onSelectProject}: QueryEdgeDetailTabProps) {
    return (
        <Box sx={{display: 'flex', flexDirection: 'column'}}>
            <Box sx={{px: 2.5, pt: 2}}>
                <Text variant="body2" color="text.secondary">
                    {edge.a.name} ↔ {edge.b.name}: {formatShared(edge.w)} among the scanned projects.
                </Text>
            </Box>
            <Box sx={{height: 360}}>
                <RelatedList
                    caption={`${shared.estimatedTotalHits.toLocaleString('en-US')} project${shared.estimatedTotalHits === 1 ? '' : 's'} linking ${edge.a.name} and ${edge.b.name}`}
                    filterCaption={filterCaption}
                    rows={shared.hits.map(projectRow)}
                    page={page}
                    pageCount={shared.pageCount}
                    onPageChange={onPageChange}
                    loading={loading}
                    emptyMessage="No project in the index lists both organisations under this search."
                    onSelect={onSelectProject}
                />
            </Box>
            <OrganisationSection name={edge.a.name} detail={detailA} />
            <OrganisationSection name={edge.b.name} detail={detailB} />
        </Box>
    )
}
