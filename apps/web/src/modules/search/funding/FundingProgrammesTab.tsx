'use client'

import {GRANT_FACET_FIELDS, type GrantRow} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import {PaginatedList, RankingButton} from '@/common/components'
import {Text} from '@/common/text'
import {FacetValuesMenuButton} from '../entity/FacetValuesMenuButton'
import {useEntityFacets} from '../entity/useEntityFacets'
import {GrantResultRow} from '../grants/GrantResultRow'
import {useFundingGrants, type FundingGrantsParams} from './useFundingGrants'

/**
 * How the picker ranks. Both orders are useful and they disagree sharply:
 * by money the list is national research councils, by heritage projects it is
 * the programmes this monitor is actually about.
 */
const SORT_OPTIONS = [
    {value: 'dchProjects', label: 'Heritage projects (high–low)', direction: 'desc'},
    {value: 'funding', label: 'Funding (high–low)', direction: 'desc'},
] as const

export type FundingGrantSort = (typeof SORT_OPTIONS)[number]['value']

export interface FundingProgrammesTabProps {
    params: FundingGrantsParams
    /** The stream currently driving the page, if any. */
    selectedStream: string | null
    onSortChange: (sort: FundingGrantSort) => void
    onPageChange: (page: number) => void
    onFacetChange: (facet: 'funder' | 'programme' | 'jurisdiction', values: string[]) => void
    /** Picking a grant narrows the whole page — list and map — to its projects. */
    onSelectGrant: (grant: GrantRow) => void
    onClearStream: () => void
}

/**
 * The grant picker: choose a funding stream and the whole page follows.
 *
 * Its menus write the SAME `funder`/`programme` params the map is filtered by,
 * so narrowing the picker narrows the map with it. `jurisdiction` is the one
 * exception — the projects index has no jurisdiction, so it only narrows this
 * list, which is why it sits last and is labelled as a picker aid.
 */
export function FundingProgrammesTab({
    params,
    selectedStream,
    onSortChange,
    onPageChange,
    onFacetChange,
    onSelectGrant,
    onClearStream,
}: FundingProgrammesTabProps) {
    const {data, loading} = useFundingGrants(params, true)
    const facets = useEntityFacets(GRANT_FACET_FIELDS, data.facetDistribution, data.facetLabels)

    return (
        <Box sx={{display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: 1.5, p: 2}}>
            <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center'}}>
                {facets.map((facet) => (
                    <FacetValuesMenuButton
                        key={facet.config.param}
                        entity="grants"
                        facet={facet.config.param}
                        label={facet.config.label}
                        value={params[facet.config.param as 'funder' | 'programme' | 'jurisdiction']}
                        onChange={(next) => onFacetChange(facet.config.param as 'funder' | 'programme' | 'jurisdiction', next)}
                        fallbackOptions={facet.options}
                    />
                ))}
                <RankingButton options={SORT_OPTIONS} value={params.sort} onChange={(next) => onSortChange(next as FundingGrantSort)} />
            </Box>

            {selectedStream && (
                <Chip
                    label={`Funding stream: ${selectedStream}`}
                    onDelete={onClearStream}
                    size="small"
                    color="secondary"
                    sx={{alignSelf: 'flex-start', maxWidth: '100%'}}
                />
            )}

            <Text variant="caption" color="text.secondary">
                Pick a programme to narrow the map and the ranking to the projects it funded. Jurisdiction narrows this list only — projects
                carry no jurisdiction of their own.
            </Text>

            <Box sx={{flex: '1 1 auto', minHeight: 0}}>
                <PaginatedList
                    header={
                        <Text variant="body2" color="text.secondary">
                            {loading
                                ? 'Loading funding streams…'
                                : data.hits.length === 0
                                  ? 'No funding streams match these filters.'
                                  : `${data.estimatedTotalHits.toLocaleString('en-US')} funding streams`}
                        </Text>
                    }
                    items={data.hits}
                    getItemKey={(item) => item.id}
                    renderItem={(item) => (
                        <GrantResultRow grant={item} selected={item.id === selectedStream} onSelect={() => onSelectGrant(item)} />
                    )}
                    page={data.page}
                    pageCount={data.pageCount}
                    onPageChange={onPageChange}
                />
            </Box>
        </Box>
    )
}
