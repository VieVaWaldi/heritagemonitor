'use client'

import type {NetworkNode, OrganisationDetail, ProjectSearchResponse} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import HubIcon from '@mui/icons-material/Hub'
import {Text} from '@/common/text'
import {RelatedList, type RelatedRow} from '../entity/RelatedList'
import {OrganisationOverviewTab} from '../organisations/OrganisationOverviewTab'
import {formatShared} from './networkAdapter'

export interface NetworkDetailTabProps {
    /** The selected organisation, as a node of the network. */
    node: NetworkNode
    /** The centre: the other half of the pair. */
    centre: NetworkNode
    detail: OrganisationDetail | null
    /** The projects that link the two; empty and unused when the selected one IS the centre. */
    shared: ProjectSearchResponse
    sharedPage: number
    onSharedPageChange: (page: number) => void
    sharedLoading: boolean
    /** Caption saying which project filters narrowed the shared list. */
    filterCaption: string
    onCentre: (id: string) => void
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

/**
 * The second tab: the selected organisation and, for a partner, the project(s)
 * that link it to the centre — the pair, which is what an arc means. For the
 * centre itself only the overview shows; its own projects are the third tab.
 */
export function NetworkDetailTab({
    node,
    centre,
    detail,
    shared,
    sharedPage,
    onSharedPageChange,
    sharedLoading,
    filterCaption,
    onCentre,
    onSelectProject,
}: NetworkDetailTabProps) {
    const isCentre = node.id === centre.id

    return (
        <Box sx={{display: 'flex', flexDirection: 'column'}}>
            {!isCentre && (
                <Box sx={{px: 2.5, pt: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap'}}>
                    <Text variant="body2" color="text.secondary" sx={{flex: '1 1 auto', minWidth: 0}}>
                        {centre.name} ↔ {node.name}: {formatShared(node.w)}
                    </Text>
                    <Button size="small" variant="outlined" startIcon={<HubIcon fontSize="small" />} onClick={() => onCentre(node.id)}>
                        Show its network
                    </Button>
                </Box>
            )}

            {!isCentre && (
                <Box sx={{height: 360, borderBottom: 1, borderColor: 'divider'}}>
                    <RelatedList
                        caption={`${shared.estimatedTotalHits.toLocaleString('en-US')} project${shared.estimatedTotalHits === 1 ? '' : 's'} linking ${centre.name} and ${node.name}`}
                        filterCaption={filterCaption}
                        rows={shared.hits.map(projectRow)}
                        page={sharedPage}
                        pageCount={shared.pageCount}
                        onPageChange={onSharedPageChange}
                        loading={sharedLoading}
                        emptyMessage="No project in the index lists both organisations under these filters."
                        onSelect={onSelectProject}
                    />
                </Box>
            )}

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
