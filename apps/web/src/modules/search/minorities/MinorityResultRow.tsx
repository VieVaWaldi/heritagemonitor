'use client'

import type {MinorityDto} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import ListItemButton from '@mui/material/ListItemButton'
import {Text} from '@/common/text'
import {formatCount, formatCountries, formatPopulation, formatRowProjectCount, labelSourceClass} from './minorityFormat'

export interface MinorityResultRowProps {
    minority: MinorityDto
    selected: boolean
    onSelect: (qid: string) => void
    /** The active corpus: the DCH corpus shows the DCH project count. */
    corpus?: string
}

const ROW_HEIGHT = 64

export function MinorityResultRow({minority, selected, onSelect, corpus}: MinorityResultRowProps) {
    const meta = [
        labelSourceClass(minority.source_class[0] ?? ''),
        formatCountries(minority.countries),
        formatPopulation(minority.population),
        formatRowProjectCount(minority, corpus),
        formatCount(minority.work_count, 'work'),
    ]
        .filter(Boolean)
        .join(' · ')

    return (
        <ListItemButton
            divider
            selected={selected}
            onClick={() => onSelect(minority.qid)}
            sx={{height: ROW_HEIGHT, display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5}}
        >
            <Box sx={{flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column'}}>
                <Text variant="body1" truncate sx={{color: 'primary.main', fontWeight: 500}}>
                    {minority.group_name_en}
                </Text>
                <Text variant="body2" truncate color="text.secondary">
                    {meta}
                </Text>
            </Box>

            {/* A group the project chose to study, rather than one harvested
                from Wikidata — worth marking, and what the default order
                ranks first. */}
            {minority.dch_project_count != null && minority.dch_project_count > 0 && (
                <Chip label="DCH" size="small" color="secondary" variant="outlined" sx={{flexShrink: 0}} />
            )}
        </ListItemButton>
    )
}
