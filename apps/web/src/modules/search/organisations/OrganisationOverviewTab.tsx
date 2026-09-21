'use client'

import {organisationLinks, type OrganisationDetail} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import type {ReactNode} from 'react'
import {Text} from '@/common/text'
import {formatCount, formatOrganisationFunding, organisationName} from './organisationFormat'

export interface OrganisationOverviewTabProps {
    organisation: OrganisationDetail
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

function formatAddress(organisation: OrganisationDetail): string | null {
    const parts = [
        organisation.address_street,
        [organisation.address_postalcode, organisation.address_city].filter(Boolean).join(' ') || null,
        organisation.address_country ?? organisation.countryCode,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : null
}

/**
 * Everything the index holds about one organisation. `organisationLinks`
 * (shared) is the only thing that decides which outbound links exist — the
 * same call feeds Lucy's approved sources, so what she can fetch is exactly
 * what the user can click.
 */
export function OrganisationOverviewTab({organisation}: OrganisationOverviewTabProps) {
    const links = organisationLinks(organisation)
    const address = formatAddress(organisation)

    return (
        <Box sx={{p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5}}>
            <Box sx={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2}}>
                <Box>
                    <Text variant="h6">{organisationName(organisation)}</Text>
                    {organisation.legalShortName && organisation.legalShortName !== organisation.legalName && (
                        <Text variant="body2" color="text.secondary">
                            {organisation.legalShortName}
                        </Text>
                    )}
                </Box>
                {organisation.has_dch_project && <Chip label="DCH" size="small" color="secondary" sx={{flexShrink: 0}} />}
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

            <Field label="Research">
                <Text variant="body2">
                    {formatCount(organisation.project_count, 'project')} · {formatCount(organisation.work_count, 'publication')}
                </Text>
                <Text variant="body2" color="text.secondary">
                    {formatCount(organisation.dch_project_count, 'digital cultural heritage project')}
                </Text>
            </Field>

            <Field label="Funding">
                <Text variant="body2">{formatOrganisationFunding(organisation.total_funding_eur)}</Text>
                {/* Not this organisation's budget: each project's amount split
                    equally across its participants (D13), summed. */}
                <Text variant="body2" color="text.secondary">
                    Equal-split share of its projects&apos; budgets, approximate EUR
                </Text>
            </Field>

            {(organisation.region || organisation.countryCode || address) && (
                <Field label="Location">
                    <Text variant="body2">
                        {[organisation.countryCode, organisation.region].filter(Boolean).join(' · ') || 'Unknown'}
                    </Text>
                    {address && (
                        <Text variant="body2" color="text.secondary">
                            {address}
                        </Text>
                    )}
                    <Text variant="body2" color="text.secondary">
                        {organisation.hasGeo
                            ? `Geolocated${organisation.geolocation_source ? ` (source: ${organisation.geolocation_source})` : ''} — appears on maps`
                            : 'No coordinates — cannot be placed on a map'}
                        {organisation.nuts3 ? ` · NUTS3 ${organisation.nuts3}` : ''}
                    </Text>
                </Field>
            )}

            {organisation.rorTypes.length > 0 && (
                <Field label="Type">
                    <Stack direction="row" spacing={1} sx={{flexWrap: 'wrap', gap: 1, mt: 0.5}}>
                        {organisation.rorTypes.map((type) => (
                            <Chip key={type} label={type} size="small" variant="outlined" />
                        ))}
                    </Stack>
                </Field>
            )}

            {organisation.alternativeNames.length > 0 && (
                <Field label="Also known as">
                    <Text variant="body2" color="text.secondary">
                        {organisation.alternativeNames.join(', ')}
                    </Text>
                </Field>
            )}

            <Field label="Identifiers">
                <Text variant="body2" color="text.secondary">
                    Organisation id {organisation.id}
                    {organisation.rorId ? ` · ROR ${organisation.rorId}` : ''}
                    {organisation.rorStatus ? ` (${organisation.rorStatus})` : ''}
                    {organisation.rorEstablished ? ` · established ${organisation.rorEstablished}` : ''}
                </Text>
                {/* The key duplicate institutions share: the same organisation
                    can appear under several ids, and this is what a later
                    merge (networks, experts) groups them by. */}
                {organisation.name_key && (
                    <Text variant="body2" color="text.secondary">
                        Merge key: {organisation.name_key}
                    </Text>
                )}
            </Field>
        </Box>
    )
}
