'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import {Text} from '@/common/text'
import {formatCount, formatFunding, OrganisationCard, ProjectList, type MapOrganisation} from '@/common/deckgl'

export interface OrganisationDetailProps {
    organisation: MapOrganisation
    /** Other organisations sharing this organisation's hex */
    neighbours: MapOrganisation[]
    onSelectOrganisation: (id: string) => void
}

export function OrganisationDetail({organisation, neighbours, onSelectOrganisation}: OrganisationDetailProps) {
    return (
        <Box sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
            <OrganisationCard
                name={organisation.name}
                country={organisation.country}
                type={organisation.type}
                sme={organisation.sme}
                facts={[
                    `${formatFunding(organisation.funding)} funding across ${formatCount(organisation.projects.length, 'project')}`,
                ]}
            />

            {neighbours.length > 0 && (
                <Box sx={{display: 'flex', flexDirection: 'column', gap: 1}}>
                    <Text variant="subtitle2">Also in this hexagon</Text>
                    <Box sx={{display: 'flex', gap: 0.75, flexWrap: 'wrap'}}>
                        {neighbours.map((neighbour) => (
                            <Chip
                                key={neighbour.id}
                                label={neighbour.name}
                                size="small"
                                onClick={() => onSelectOrganisation(neighbour.id)}
                            />
                        ))}
                    </Box>
                </Box>
            )}

            <Text variant="subtitle2">Projects</Text>
            <ProjectList projects={organisation.projects} costLabel="Own cost" />
        </Box>
    )
}
