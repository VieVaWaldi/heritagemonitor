'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import {Text} from '@/common/text'
import {formatDateRange, formatFunding} from '../format'
import type {ProjectSummary} from '../organisations'

export interface ProjectListProps {
    projects: ProjectSummary[]
    /** Column caption for the amount on the right, e.g. "Cost" */
    costLabel: string
}

export function ProjectList({projects, costLabel}: ProjectListProps) {
    return (
        <List disablePadding>
            {projects.map((project) => (
                <ListItem key={project.id} divider disableGutters sx={{gap: 2, alignItems: 'flex-start'}}>
                    <Box sx={{flex: '1 1 auto', minWidth: 0}}>
                        <Text variant="body2" sx={{fontWeight: 500}}>
                            {project.title}
                        </Text>
                        <Box sx={{display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.5}}>
                            <Text variant="caption" color="text.secondary">
                                {formatDateRange(project.startDate, project.endDate)}
                            </Text>
                            {project.frameworkProgrammes.map((programme) => (
                                <Chip key={programme} label={programme} size="small" variant="outlined" />
                            ))}
                        </Box>
                    </Box>
                    <Box sx={{flexShrink: 0, textAlign: 'right'}}>
                        <Text variant="body2">{formatFunding(project.cost)}</Text>
                        <Text variant="caption" color="text.secondary">
                            {costLabel}
                        </Text>
                    </Box>
                </ListItem>
            ))}
        </List>
    )
}
