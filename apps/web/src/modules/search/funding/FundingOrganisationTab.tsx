'use client'

import type {FundingOrganisation, ProjectRow, ProjectSearchResponse} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import {OrganisationCard} from '@/common/deckgl'
import {Text} from '@/common/text'
import {RelatedList, type RelatedRow} from '../entity/RelatedList'
import {formatResultCount} from '../entity/searchState'
import {FUNDING_AMOUNT_CAVEAT, formatCount, formatFundingEur} from './fundingFormat'

export interface FundingOrganisationTabProps {
    organisation: FundingOrganisation
    projects: ProjectSearchResponse
    page: number
    onPageChange: (page: number) => void
    loading: boolean
    /** Opens this project on the projects entity — see buildEntityLink. */
    onSelectProject: (projectId: string) => void
    /** What of the surrounding page this list is filtered by — see relatedParams. */
    filterCaption?: string
}

function toRow(project: ProjectRow): RelatedRow {
    return {
        id: project.id,
        primary:
            project.acronym && project.title ? `${project.acronym} — ${project.title}` : (project.acronym ?? project.title ?? project.id),
        secondary: [
            project.year != null ? String(project.year) : null,
            project.funded_amount_eur != null ? `approx. ${Math.round(project.funded_amount_eur).toLocaleString('en-US')} EUR total` : null,
            project.topic?.topic_name ?? null,
        ]
            .filter(Boolean)
            .join(' · '),
    }
}

/**
 * The selected organisation, and the matching projects its funding share was
 * computed from. The euro figure on the card is this organisation's equal-split
 * share; each project row shows the project's FULL budget, which is why the
 * two do not add up and the caveat says so.
 */
export function FundingOrganisationTab({
    organisation,
    projects,
    page,
    onPageChange,
    loading,
    onSelectProject,
    filterCaption,
}: FundingOrganisationTabProps) {
    return (
        <Box sx={{p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, height: '100%', minHeight: 0}}>
            <OrganisationCard
                name={organisation.name}
                country={organisation.country}
                type={organisation.region}
                sme={null}
                facts={[
                    `${formatFundingEur(organisation.fundingEur)} across ${formatCount(organisation.projectCount, 'matching project')}`,
                    organisation.mergedRecords > 1
                        ? `Merged from ${organisation.mergedRecords} index records of the same institution`
                        : null,
                    organisation.hasGeo ? null : 'No coordinates — this organisation is not on the map',
                ].filter((fact): fact is string => fact !== null)}
            />

            <Text variant="caption" color="text.secondary">
                {FUNDING_AMOUNT_CAVEAT}
            </Text>

            <Box sx={{flex: '1 1 auto', minHeight: 0, overflow: 'auto'}}>
                <RelatedList
                    caption={`${formatResultCount(projects)} of the matching projects, largest budget first`}
                    filterCaption={filterCaption}
                    closeMatches={projects.mode === 'fuzzy'}
                    rows={projects.hits.map(toRow)}
                    page={page}
                    pageCount={projects.pageCount}
                    onPageChange={onPageChange}
                    loading={loading}
                    emptyMessage="None of the matching projects list this organisation."
                    onSelect={onSelectProject}
                />
            </Box>
        </Box>
    )
}
