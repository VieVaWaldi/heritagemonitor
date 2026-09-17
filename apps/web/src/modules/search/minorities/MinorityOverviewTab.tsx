'use client'

import type {MinorityDto} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import {Text} from '@/common/text'
import {formatPopulation, wikipediaUrl} from './minorityFormat'
import {useMinorityImage} from './useMinorityImage'

export interface MinorityOverviewTabProps {
    minority: MinorityDto
}

function ChipRow({label, values}: {label: string; values: string[]}) {
    // Only rendered by the caller when values is non-empty — no
    // "no data" placeholder per sparse field, per the design.
    return (
        <Box>
            <Text variant="overline" color="text.secondary" sx={{fontWeight: 600, display: 'block', mb: 0.5}}>
                {label}
            </Text>
            <Stack direction="row" spacing={1} sx={{flexWrap: 'wrap', gap: 1}}>
                {values.map((value) => (
                    <Chip key={value} label={value} size="small" variant="outlined" />
                ))}
            </Stack>
        </Box>
    )
}

// Detail view of the selected group — no project/publication data here yet,
// mirrors the placeholder's own honest "No overview available yet" until
// core_v3/core_v4 can actually link minorities to research.
export function MinorityOverviewTab({minority}: MinorityOverviewTabProps) {
    const aliases = minority.search_keywords.filter((keyword) => keyword !== minority.group_name_en)
    const {imageUrl} = useMinorityImage(minority.qid)

    return (
        <Box sx={{p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5}}>
            <Box sx={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2}}>
                <Box sx={{display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap'}}>
                    <Text variant="h6">{minority.group_name_en}</Text>
                    <Link
                        href={wikipediaUrl(minority.qid)}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem'}}
                    >
                        Wikipedia <OpenInNewIcon fontSize="inherit" />
                    </Link>
                </Box>

                {imageUrl && (
                    <Box
                        component="img"
                        src={imageUrl}
                        alt={minority.group_name_en}
                        sx={{width: 72, height: 72, borderRadius: 2, objectFit: 'cover', flexShrink: 0}}
                    />
                )}
            </Box>

            <Box>
                <Text variant="overline" color="text.secondary" sx={{fontWeight: 600, display: 'block'}}>
                    Population
                </Text>
                <Text variant="body2">{formatPopulation(minority.population)}</Text>
            </Box>

            {minority.countries.length > 0 && <ChipRow label="Countries" values={minority.countries} />}
            {minority.religions.length > 0 && <ChipRow label="Religions" values={minority.religions} />}
            {minority.native_languages.length > 0 && (
                <ChipRow label="Native languages" values={minority.native_languages} />
            )}
            {minority.subclass_of.length > 0 && <ChipRow label="Subclass of" values={minority.subclass_of} />}

            {aliases.length > 0 && (
                <Box>
                    <Text variant="overline" color="text.secondary" sx={{fontWeight: 600, display: 'block', mb: 0.5}}>
                        Also known as
                    </Text>
                    <Text variant="body2" color="text.secondary">
                        {aliases.join(', ')}
                    </Text>
                </Box>
            )}
        </Box>
    )
}
