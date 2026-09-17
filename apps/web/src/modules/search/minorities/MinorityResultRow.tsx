'use client'

import type {MinorityDto} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ListItemButton from '@mui/material/ListItemButton'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import {Text} from '@/common/text'
import {formatCountries, formatPopulation, labelSourceClass, wikidataUrl} from './minorityFormat'

export interface MinorityResultRowProps {
    minority: MinorityDto
    selected: boolean
    onSelect: (qid: string) => void
}

// Same two-line row shape as ../components/SearchResultRow (title/meta/
// action-button) — kept as its own copy rather than shared, same reasoning
// as that component's own comment: the two are expected to keep diverging
// (this one is clickable and links out to Wikidata instead of a PDF).
const ROW_HEIGHT = 64

export function MinorityResultRow({minority, selected, onSelect}: MinorityResultRowProps) {
    const meta = [
        labelSourceClass(minority.source_class[0] ?? ''),
        formatCountries(minority.countries),
        formatPopulation(minority.population),
    ]
        .filter(Boolean)
        .join(' · ')

    return (
        <ListItemButton
            divider
            selected={selected}
            onClick={() => onSelect(minority.qid)}
            sx={{height: ROW_HEIGHT, display: 'flex', alignItems: 'center', gap: 2, px: 2.5}}
        >
            <Box sx={{flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column'}}>
                <Text variant="body1" truncate sx={{color: 'primary.main', fontWeight: 500}}>
                    {minority.group_name_en}
                </Text>
                <Text variant="body2" truncate color="text.secondary">
                    {meta}
                </Text>
            </Box>

            <Button
                component="a"
                href={wikidataUrl(minority.qid)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                variant="outlined"
                size="small"
                endIcon={<OpenInNewIcon fontSize="small" />}
                sx={{minWidth: 96, flexShrink: 0}}
            >
                Wikidata
            </Button>
        </ListItemButton>
    )
}
