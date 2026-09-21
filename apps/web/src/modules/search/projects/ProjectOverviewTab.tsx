'use client'

import {projectLinks, type ProjectDetail} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import type {ReactNode} from 'react'
import {Text} from '@/common/text'
import {formatCount, formatFunderProgramme, formatFunding, formatYear} from './projectFormat'

export interface ProjectOverviewTabProps {
    project: ProjectDetail
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

function formatDateRange(startDate: string | null, endDate: string | null): string | null {
    if (!startDate && !endDate) return null
    return `${startDate ?? '?'} → ${endDate ?? '?'}`
}

/**
 * Everything the index holds about one project. `projectLinks` (shared) is
 * the only thing that decides which outbound links exist — the same call
 * feeds Lucy's approved sources, so what she can fetch is exactly what the
 * user can click.
 */
export function ProjectOverviewTab({project}: ProjectOverviewTabProps) {
    const links = projectLinks(project)
    const dates = formatDateRange(project.startDate, project.endDate)
    // Coordinators are only known for EC projects (the other funders' data
    // has no role), so the marker is shown only when there are any.
    const coordinatorNames = project.coordinator_ids
        .map((id) => project.org_names[project.org_ids.indexOf(id)])
        .filter((name): name is string => Boolean(name))

    return (
        <Box sx={{p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5}}>
            <Box sx={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2}}>
                <Box>
                    <Text variant="h6">{project.acronym ?? project.title ?? project.id}</Text>
                    {project.acronym && project.title && (
                        <Text variant="body2" color="text.secondary">
                            {project.title}
                        </Text>
                    )}
                </Box>
                <Stack direction="row" spacing={1} sx={{flexShrink: 0}}>
                    {project.is_ch && <Chip label="DCH" size="small" color="secondary" />}
                    {/* The title/summary of a non-English project was machine
                        translated during the pipeline — worth saying so. */}
                    {project.is_translated && <Chip label="Translated" size="small" variant="outlined" />}
                </Stack>
            </Box>

            {links.length > 0 && (
                <Field label="Links">
                    <Stack direction="row" spacing={2} sx={{flexWrap: 'wrap', gap: 1, mt: 0.5}}>
                        {links.map((link) => (
                            <Link
                                key={link.url}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem'}}
                            >
                                {link.label} <OpenInNewIcon fontSize="inherit" />
                            </Link>
                        ))}
                    </Stack>
                </Field>
            )}

            {project.summary && (
                <Field label="Summary">
                    <Text variant="body2">{project.summary}</Text>
                </Field>
            )}

            <Field label="Funding">
                <Text variant="body2">
                    {formatFunding(project.funded_amount_eur)}
                    {project.currency && project.currency !== 'EUR' && project.funded_amount != null
                        ? ` (${Math.round(project.funded_amount).toLocaleString('en-US')} ${project.currency})`
                        : ''}
                </Text>
                <Text variant="body2" color="text.secondary">
                    {formatFunderProgramme(project.funder, project.programme)}
                    {project.funder_names.length > 0 ? ` — ${project.funder_names.join(', ')}` : ''}
                </Text>
                {project.funded_eur_per_org != null && (
                    <Text variant="body2" color="text.secondary">
                        approx. {Math.round(project.funded_eur_per_org).toLocaleString('en-US')} EUR per organisation
                        (equal split)
                    </Text>
                )}
            </Field>

            <Field label="Timeline">
                <Text variant="body2">{dates ?? formatYear(project.year)}</Text>
            </Field>

            <Field label="Scale">
                <Text variant="body2">
                    {formatCount(project.org_count, 'organisation')} · {formatCount(project.work_count, 'work')}
                </Text>
                {coordinatorNames.length > 0 && (
                    <Text variant="body2" color="text.secondary">
                        Coordinator: {coordinatorNames.join(', ')}
                    </Text>
                )}
            </Field>

            {project.topic && (
                <Field label="Topic">
                    <Text variant="body2">{project.topic.topic_name}</Text>
                    <Text variant="body2" color="text.secondary">
                        {project.topic.subfield_name} · {project.topic.field_name} · {project.topic.domain_name}
                    </Text>
                </Field>
            )}

            {project.theme && <ChipRow label="Theme" values={[project.theme]} />}
            {project.pillar_list.length > 0 && <ChipRow label="Pillars" values={project.pillar_list} />}
            {project.org_regions.length > 0 && <ChipRow label="Regions" values={project.org_regions} />}
            {project.org_countries.length > 0 && <ChipRow label="Countries" values={project.org_countries} />}
            {project.subjects.length > 0 && <ChipRow label="Subjects" values={[...new Set(project.subjects)]} />}
            {/* Wikidata ids of the minority groups the project was tagged
                with. Keyword-based and partly false — the minorities page
                carries the full disclaimer; here they are ids only until that
                slice can resolve their names. */}
            {project.minority_qids.length > 0 && <ChipRow label="Minority tags" values={project.minority_qids} />}
            {project.keywords && (
                <Field label="Keywords">
                    <Text variant="body2">{project.keywords}</Text>
                </Field>
            )}

            <Field label="Identifiers">
                <Text variant="body2" color="text.secondary">
                    Project id {project.id}
                    {project.grantId ? ` · grant ${project.grantId}` : ''}
                    {project.callIdentifier ? ` · call ${project.callIdentifier}` : ''}
                    {project.doi ? ` · DOI ${project.doi}` : ''}
                </Text>
                {project.funding_stream_ids.length > 0 && (
                    <Text variant="body2" color="text.secondary">
                        Funding streams: {project.funding_stream_ids.join(', ')}
                    </Text>
                )}
            </Field>

            <Field label="Open access mandate">
                <Text variant="body2" color="text.secondary">
                    Publications: {project.openAccessMandateForPublications ? 'yes' : 'no'} · Datasets:{' '}
                    {project.openAccessMandateForDataset ? 'yes' : 'no'}
                </Text>
            </Field>

            {/* `pred` is the cultural-heritage classifier's score behind
                `is_ch`. Shown, never filtered on (decision D31). */}
            {project.pred != null && (
                <Field label="Cultural-heritage score">
                    <Text variant="body2" color="text.secondary">
                        {project.pred.toFixed(3)} (classifier confidence)
                    </Text>
                </Field>
            )}
        </Box>
    )
}
