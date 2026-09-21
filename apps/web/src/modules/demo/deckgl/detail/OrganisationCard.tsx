'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import {Text} from '@/common/text'

export interface OrganisationCardProps {
    name: string
    country: string | null
    type: string | null
    sme: boolean | null
    /** Extra one-line facts under the chips, e.g. total funding */
    facts?: string[]
}

export function OrganisationCard({name, country, type, sme, facts}: OrganisationCardProps) {
    return (
        <Paper variant="outlined" sx={{p: 2, display: 'flex', flexDirection: 'column', gap: 1}}>
            <Text variant="subtitle1" sx={{fontWeight: 600}}>
                {name}
            </Text>
            <Box sx={{display: 'flex', gap: 0.75, flexWrap: 'wrap'}}>
                {country && <Chip label={country} size="small" />}
                {type && <Chip label={type} size="small" variant="outlined" />}
                {sme && <Chip label="SME" size="small" variant="outlined" />}
            </Box>
            {facts?.map((fact) => (
                <Text key={fact} variant="body2" color="text.secondary">
                    {fact}
                </Text>
            ))}
        </Paper>
    )
}
