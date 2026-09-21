'use client'

import type {GrantOrganisation} from '@heritagemonitor/shared'
import {RelatedList, type RelatedRow} from '../entity/RelatedList'
import {formatCount, formatGrantFunding} from './grantFormat'

export interface GrantOrganisationsTabProps {
    organisations: GrantOrganisation[]
    /** False while the api's organisation table is still loading — see useGrantOrganisations. */
    complete: boolean
    loading: boolean
    /** Opens this organisation on the organisations entity — see buildEntityLink. */
    onSelectOrganisation: (organisationId: string) => void
}

function toRow(organisation: GrantOrganisation): RelatedRow {
    return {
        id: organisation.id,
        primary: organisation.name,
        secondary: [
            organisation.country,
            `${formatCount(organisation.projects, 'project')} in this stream`,
            `${formatGrantFunding(organisation.total_funding_eur)} across all its work`,
        ]
            .filter(Boolean)
            .join(' · '),
    }
}

/**
 * Who received this stream's money, most projects first.
 *
 * Not paginated, and the funding figure next to each name is the
 * ORGANISATION's lifetime total across everything it does — the index holds no
 * per-stream amount per organisation, so the alternative would be a number
 * that looks like one and is not.
 */
export function GrantOrganisationsTab({organisations, complete, loading, onSelectOrganisation}: GrantOrganisationsTabProps) {
    return (
        <RelatedList
            caption={
                complete
                    ? `Top ${organisations.length} organisations by projects in this stream`
                    : 'Organisation names are still loading on the server — try again in a moment.'
            }
            rows={organisations.map(toRow)}
            page={1}
            pageCount={1}
            onPageChange={() => undefined}
            loading={loading}
            emptyMessage={
                complete
                    ? 'No organisations are recorded for this funding stream.'
                    : 'Organisation names are not available yet.'
            }
            onSelect={onSelectOrganisation}
        />
    )
}
