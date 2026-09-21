'use client'

import type {CollaborationEdge} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import {Text} from '@/common/text'
import {formatCount} from '../format'
import type {ProjectSummary} from '../organisations'
import {OrganisationCard} from './OrganisationCard'
import {ProjectList} from './ProjectList'

// Both organisations of one arc, plus the projects they shared. A shared
// project's cost is the two partners' costs added together.
export function CollaborationDetail({edge}: {edge: CollaborationEdge}) {
    const projects: ProjectSummary[] = edge.projects.map((project) => ({
        id: project.project_id,
        title: project.title,
        startDate: project.start_date,
        endDate: project.end_date,
        frameworkProgrammes: project.framework_programmes ?? [],
        cost: project.institution_cost + project.collaborator_cost,
    }))

    return (
        <Box sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
            <Box sx={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 2}}>
                <OrganisationCard
                    name={edge.institution_name}
                    country={edge.institution_country}
                    type={edge.institution_type}
                    sme={edge.institution_sme}
                />
                <OrganisationCard
                    name={edge.collaborator_name}
                    country={edge.collaborator_country}
                    type={edge.collaborator_type}
                    sme={edge.collaborator_sme}
                />
            </Box>

            <Text variant="subtitle2">{formatCount(projects.length, 'shared project')}</Text>
            <ProjectList projects={projects} costLabel="Combined cost" />
        </Box>
    )
}
