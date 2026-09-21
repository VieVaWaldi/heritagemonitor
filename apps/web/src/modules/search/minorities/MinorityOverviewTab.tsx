'use client'

import type {MinorityDto} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import type {ReactNode} from 'react'
import {NoticeBar} from '@/common/components'
import {Text} from '@/common/text'
import {MINORITY_COUNT_DISCLAIMER, formatCount, formatPopulation, labelSourceClass, wikidataUrl} from './minorityFormat'
import {useMinorityImage} from './useMinorityImage'

export interface MinorityOverviewTabProps {
    minority: MinorityDto
}

function Field({label, children}: {label: string; children: ReactNode}) {
    return (
        <Box>
            <Text variant="overline" color="text.secondary" sx={{fontWeight: 600, display: 'block'}}>
                {label}
            </Text>
            {children}
        </Box>
    )
}

function ChipRow({label, values}: {label: string; values: string[]}) {
    return (
        <Field label={label}>
            <Stack direction="row" spacing={1} sx={{flexWrap: 'wrap', gap: 1, mt: 0.5}}>
                {values.map((value) => (
                    <Chip key={value} label={value} size="small" variant="outlined" />
                ))}
            </Stack>
        </Field>
    )
}

export function MinorityOverviewTab({minority}: MinorityOverviewTabProps) {
    const aliases = minority.search_keywords.filter((keyword) => keyword !== minority.group_name_en)
    const {imageUrl} = useMinorityImage(minority.qid)
    const hasResearch = (minority.project_count ?? 0) > 0

    return (
        <Box sx={{p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5}}>
            <Box sx={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2}}>
                <Box sx={{minWidth: 0}}>
                    <Box sx={{display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap'}}>
                        <Text variant="h6">{minority.group_name_en}</Text>
                        {minority.is_seed && <Chip label="Seed group" size="small" color="secondary" />}
                    </Box>
                    <Link
                        href={wikidataUrl(minority.qid)}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem'}}
                    >
                        Wikidata {minority.qid} <OpenInNewIcon fontSize="inherit" />
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

            <Field label="Research about this group">
                <Text variant="body2">
                    {formatCount(minority.project_count, 'project')} · {formatCount(minority.work_count, 'publication')} ·{' '}
                    {formatCount(minority.org_count, 'organisation')}
                </Text>
                <Text variant="body2" color="text.secondary">
                    {formatCount(minority.dch_project_count, 'digital cultural heritage project')}
                </Text>
            </Field>

            {/* Said once, prominently, next to the numbers it qualifies. */}
            <NoticeBar tone="note">{MINORITY_COUNT_DISCLAIMER}</NoticeBar>

            {/* 9 of the 278 groups have no matching research at all. They stay
                listed on purpose: "nobody has studied this group" is an
                answer this platform exists to be able to give. */}
            {!hasResearch && (
                <Text variant="body2" color="text.secondary">
                    No projects in the index mention this group. That is a finding, not a gap in the page.
                </Text>
            )}

            <Field label="Population">
                <Text variant="body2">{formatPopulation(minority.population)}</Text>
            </Field>

            {minority.source_class.length > 0 && (
                <ChipRow label="Type" values={minority.source_class.map(labelSourceClass)} />
            )}
            {minority.countries.length > 0 && <ChipRow label="Countries" values={minority.countries} />}
            {minority.religions.length > 0 && <ChipRow label="Religions" values={minority.religions} />}
            {minority.native_languages.length > 0 && <ChipRow label="Native languages" values={minority.native_languages} />}
            {minority.subclass_of.length > 0 && <ChipRow label="Subclass of" values={minority.subclass_of} />}
            {minority.admin_territory.length > 0 && <ChipRow label="Admin territory" values={minority.admin_territory} />}
            {minority.ancestral_home.length > 0 && <ChipRow label="Ancestral home" values={minority.ancestral_home} />}

            {aliases.length > 0 && (
                <Field label="Also known as">
                    <Text variant="body2" color="text.secondary">
                        {aliases.join(', ')}
                    </Text>
                </Field>
            )}

            <Field label="Identifiers">
                <Text variant="body2" color="text.secondary">
                    Wikidata {minority.qid}
                    {/* Other ids folded into this group; projects may be
                        tagged with any of them. */}
                    {minority.merged_qids.filter((qid) => qid !== minority.qid).length > 0
                        ? ` · merged with ${minority.merged_qids.filter((qid) => qid !== minority.qid).join(', ')}`
                        : ''}
                </Text>
            </Field>
        </Box>
    )
}
