'use client'

import type {OrganisationProject, OrganisationProjectsResponse} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import Pagination from '@mui/material/Pagination'
import {Text} from '@/common/text'
import {formatResultCount} from '../entity/searchState'

export interface OrganisationProjectsTabProps {
    projects: OrganisationProjectsResponse
    page: number
    onPageChange: (page: number) => void
    loading: boolean
    /** Opens this project on the projects entity — see buildEntityLink. */
    onSelectProject: (projectId: string) => void
}

const ROW_HEIGHT = 64

function projectMeta(project: OrganisationProject): string {
    return [
        project.year != null ? String(project.year) : null,
        [...project.funder, ...project.programme].join(' / ') || null,
        project.funded_amount_eur != null
            ? `approx. ${Math.round(project.funded_amount_eur).toLocaleString('en-US')} EUR`
            : null,
    ]
        .filter(Boolean)
        .join(' · ')
}

/**
 * The projects this organisation worked on, biggest budget first, with the
 * ones it coordinates marked. A row is a link INTO the projects entity —
 * clicking it opens that project there rather than trying to show a project
 * inside the organisations page.
 */
export function OrganisationProjectsTab({projects, page, onPageChange, loading, onSelectProject}: OrganisationProjectsTabProps) {
    if (projects.hits.length === 0) {
        return (
            <Box sx={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2.5}}>
                <Text variant="body2" color="text.secondary" sx={{textAlign: 'center'}}>
                    {loading ? 'Loading…' : 'No projects recorded for this organisation.'}
                </Text>
            </Box>
        )
    }

    return (
        <Box sx={{height: '100%', display: 'flex', flexDirection: 'column'}}>
            <Text variant="caption" color="text.secondary" sx={{px: 2.5, py: 1}}>
                {formatResultCount(projects)} projects, largest budget first
            </Text>

            <List disablePadding sx={{flex: '1 1 auto', overflowY: 'auto'}}>
                {projects.hits.map((project) => (
                    <ListItemButton
                        key={project.id}
                        divider
                        onClick={() => onSelectProject(project.id)}
                        sx={{height: ROW_HEIGHT, display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5}}
                    >
                        <Box sx={{flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column'}}>
                            <Text variant="body2" truncate sx={{color: 'primary.main', fontWeight: 500}}>
                                {project.acronym && project.title
                                    ? `${project.acronym} — ${project.title}`
                                    : (project.acronym ?? project.title ?? project.id)}
                            </Text>
                            <Text variant="caption" truncate color="text.secondary">
                                {projectMeta(project)}
                            </Text>
                        </Box>
                        {project.isCoordinator && (
                            <Chip label="Coordinator" size="small" color="primary" variant="outlined" sx={{flexShrink: 0}} />
                        )}
                    </ListItemButton>
                ))}
            </List>

            {projects.pageCount > 1 && (
                <Box sx={{display: 'flex', justifyContent: 'center', py: 1, borderTop: 1, borderColor: 'divider'}}>
                    <Pagination count={projects.pageCount} page={page} onChange={(_event, value) => onPageChange(value)} size="small" />
                </Box>
            )}
        </Box>
    )
}
