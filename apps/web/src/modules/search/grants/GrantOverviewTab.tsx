'use client'

import {GRANT_FUNDING_CAVEAT, PSEUDO_GRANT_DESCRIPTION, grantHierarchy, type GrantDetail} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import type {ReactNode} from 'react'
import {NoticeBar} from '@/common/components'
import {Text} from '@/common/text'
import {buildSearchUrl, useUrlCorpus} from '@/common/url'
import {formatCount, formatGrantFunding, grantTitle, heritageShare} from './grantFormat'

export interface GrantOverviewTabProps {
    grant: GrantDetail
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
 * Where the stream sits in the funding hierarchy: funder, then programme, then
 * action. Read straight off the id's own levels rather than re-split here —
 * `grantHierarchy` (shared) is the one place that knows the shape.
 */
function Hierarchy({grant}: {grant: GrantDetail}) {
    const levels = grantHierarchy(grant)
    if (levels.length === 0) return null

    return (
        <Stack direction="row" sx={{flexWrap: 'wrap', alignItems: 'center', gap: 0.5, mt: 0.5}}>
            {levels.map((level, index) => (
                <Box key={level.level} sx={{display: 'inline-flex', alignItems: 'center', gap: 0.5, minWidth: 0}}>
                    {index > 0 && <ChevronRightIcon fontSize="small" sx={{color: 'text.disabled'}} />}
                    <Tooltip title={level.level}>
                        <Chip label={level.value} size="small" variant={index === levels.length - 1 ? 'filled' : 'outlined'} />
                    </Tooltip>
                </Box>
            ))}
        </Stack>
    )
}

/**
 * Everything the grants index holds about one funding stream. There is no
 * outbound link to show: the index carries no URL for a stream, and a funder's
 * portal URL cannot be derived from a code without guessing.
 */
export function GrantOverviewTab({grant}: GrantOverviewTabProps) {
    const {corpus} = useUrlCorpus()
    const share = heritageShare(grant)

    return (
        <Box sx={{p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5}}>
            <Box>
                <Text variant="h6">{grantTitle(grant)}</Text>
                {grant.jurisdiction && (
                    <Text variant="body2" color="text.secondary">
                        {grant.jurisdiction}
                    </Text>
                )}
            </Box>

            {grant.is_pseudo && <NoticeBar tone="note">{PSEUDO_GRANT_DESCRIPTION}</NoticeBar>}

            <Field label="Funding hierarchy">
                <Hierarchy grant={grant} />
            </Field>

            <Field label="Projects">
                <Text variant="body2">
                    {formatCount(grant.dch_project_count, 'cultural-heritage project')} of{' '}
                    {formatCount(grant.project_count, 'project')} in total
                    {share ? ` (${share})` : ''}
                </Text>
            </Field>

            <Field label="Funding">
                <Text variant="body2">{formatGrantFunding(grant.total_funded_eur)}</Text>
                <Text variant="caption" color="text.secondary" sx={{display: 'block', mt: 0.5}}>
                    {GRANT_FUNDING_CAVEAT}
                </Text>
            </Field>

            {/* Hands the stream to the funding page, which filters its ranking
                and its map by it. Built with buildSearchUrl rather than a
                string so the id — which contains `::` and spaces — is encoded
                by the same writer every other link in the app uses
                (apps/web/RULES.md #11). */}
            <Button
                variant="outlined"
                size="small"
                href={buildSearchUrl({route: '/search/funding', stream: grant.id, corpus})}
                sx={{alignSelf: 'flex-start'}}
            >
                Explore funding of this programme
            </Button>

            <Field label="Stream id">
                <Text variant="caption" color="text.secondary" sx={{wordBreak: 'break-all'}}>
                    {grant.id}
                </Text>
            </Field>
        </Box>
    )
}
