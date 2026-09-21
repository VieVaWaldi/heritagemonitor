'use client'

import {openAccessLabel, workLinks, type WorkDetail} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import type {ReactNode} from 'react'
import {Text} from '@/common/text'
import {formatCitations, workLanguageName, workTitle} from './workFormat'

export interface WorkOverviewTabProps {
    work: WorkDetail
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

/**
 * Everything the index holds about one work. There is no abstract: the index
 * does not store one (SERVING_DESIGN 6.2), so this panel does not pretend to.
 */
export function WorkOverviewTab({work}: WorkOverviewTabProps) {
    const links = workLinks(work)

    return (
        <Box sx={{p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5}}>
            <Box sx={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2}}>
                <Text variant="h6">{workTitle(work)}</Text>
                <Stack direction="row" spacing={1} sx={{flexShrink: 0}}>
                    {work.open_access_color && (
                        <Chip label={work.open_access_color} size="small" variant="outlined" />
                    )}
                    {work.is_ch_via_project && <Chip label="DCH" size="small" color="secondary" />}
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

            <Field label="Authors">
                <Text variant="body2">
                    {work.authors.length > 0 ? work.authors.join(', ') : 'No authors recorded'}
                </Text>
                {/* The index keeps the first 20 names but the true count. */}
                {work.author_count != null && work.author_count > work.authors.length && (
                    <Text variant="body2" color="text.secondary">
                        {work.author_count} authors in total; the first {work.authors.length} are stored
                    </Text>
                )}
            </Field>

            <Field label="Published">
                <Text variant="body2">
                    {[work.container_name, work.publisher].filter(Boolean).join(' · ') || 'Publisher unknown'}
                </Text>
                <Text variant="body2" color="text.secondary">
                    {work.publication_date ?? (work.year != null ? String(work.year) : 'Date unknown')}
                </Text>
            </Field>

            <Field label="Impact">
                <Text variant="body2">{formatCitations(work.citation_count)}</Text>
            </Field>

            <Field label="Access">
                <Text variant="body2">
                    {openAccessLabel(work.open_access_color) ?? 'No open-access colour recorded'}
                </Text>
                <Text variant="body2" color="text.secondary">
                    {work.best_access_right ? `Best access right: ${work.best_access_right}` : 'Access right unknown'}
                    {workLanguageName(work) ? ` · Language: ${workLanguageName(work)}` : ''}
                </Text>
            </Field>

            <Field label="Links to research">
                <Text variant="body2">
                    {work.project_ids.length} linked {work.project_ids.length === 1 ? 'project' : 'projects'} ·{' '}
                    {work.organisation_ids.length} linked{' '}
                    {work.organisation_ids.length === 1 ? 'organisation' : 'organisations'}
                </Text>
                {/* The id list is capped at 100 even when more exist. */}
                {work.org_count != null && work.org_count > work.organisation_ids.length && (
                    <Text variant="body2" color="text.secondary">
                        {work.org_count} organisations in total; the first {work.organisation_ids.length} are stored
                    </Text>
                )}
                {work.is_ch_via_project && (
                    <Text variant="body2" color="text.secondary">
                        Counted as digital cultural heritage because a linked project is — not from the work itself
                    </Text>
                )}
                {work.link_tier != null && (
                    <Text variant="body2" color="text.secondary">
                        Link tier {work.link_tier}
                        {work.link_tier === 0 ? ' (linked through the project’s own metadata)' : ' (linked indirectly)'}
                    </Text>
                )}
            </Field>

            <Field label="Identifiers">
                <Text variant="body2" color="text.secondary">
                    Work id {work.id}
                    {work.doi ? ` · DOI ${work.doi}` : ''}
                </Text>
            </Field>
        </Box>
    )
}
