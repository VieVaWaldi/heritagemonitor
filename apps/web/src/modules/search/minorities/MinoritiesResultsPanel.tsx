'use client'

import {useMemo} from 'react'
import type {MinorityDto, MinoritySortOption} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Switch from '@mui/material/Switch'
import Tooltip from '@mui/material/Tooltip'
import DownloadIcon from '@mui/icons-material/Download'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import {FacetSection, FacetSidebar, FilterBar, FilterMenuButton, PaginatedList, TabbedPanel} from '@/common/components'
import {usePageChatContextPublisher} from '@/common/llmchat/PageChatContext'
import {Text} from '@/common/text'
import {formatPopulation, labelSourceClass} from './minorityFormat'
import {MinorityOverviewTab} from './MinorityOverviewTab'
import {MinorityResultRow} from './MinorityResultRow'
import {MinoritySubgroupsTab} from './MinoritySubgroupsTab'
import {RankingButton} from './RankingButton'
import {useMinorityFacets} from './useMinorityFacets'
import {useMinoritySearch} from './useMinoritySearch'
import {useSelectedMinority} from './useSelectedMinority'

// Feeds Lucy a compact summary of the paginated rows the user has open
// right now, so she can answer questions like "what's in this list?"
// without the user re-typing it (see common/llmchat/PageChatContext.tsx). One
// line per visible row, not the full MinorityDto: keeps the per-message
// token cost roughly constant regardless of how many fields a group has,
// at the cost of Lucy only knowing what a result row itself shows (no
// religions/languages/subgroups — she'd need those added here, or a
// tool-call to /v1/minorities/:qid, to answer questions about them).
function summarizeMinorityRow(minority: MinorityDto): string {
    const type = labelSourceClass(minority.source_class[0] ?? 'unclassified')
    const countries = minority.countries.join(', ') || 'no countries documented'
    return `- ${minority.group_name_en} (${type}, ${countries}, ${formatPopulation(minority.population)})`
}

interface ResultsHeaderProps {
    count: number
    sort: MinoritySortOption | null
    onSortChange: (value: MinoritySortOption | null) => void
}

// Count on the left, ranking + download (disabled — no export endpoint yet)
// on the right.
function ResultsHeader({count, sort, onSortChange}: ResultsHeaderProps) {
    return (
        <Box sx={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1}}>
            <Text variant="body2" color="text.secondary">
                About {count} groups
            </Text>
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                <RankingButton value={sort} onChange={onSortChange} />
                <Tooltip title="Download results (coming soon)">
                    <span>
                        <Button variant="outlined" size="small" disabled startIcon={<DownloadIcon fontSize="small" />}>
                            Download
                        </Button>
                    </span>
                </Tooltip>
            </Box>
        </Box>
    )
}

function EmptyTabMessage({message}: {message: string}) {
    return (
        <Box sx={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2.5}}>
            <Text variant="body2" color="text.secondary" sx={{textAlign: 'center'}}>
                {message}
            </Text>
        </Box>
    )
}

// Minorities-specific counterpart to ../components/SearchResultsPanel —
// that one stays the still-empty placeholder every other UseCase uses until
// it has its own backend; this one is wired to the real /v1/minorities/*
// API. Deliberately not a shared/generalized results panel yet (only one
// real UseCase exists so far) — see resultsPanelRegistry.ts for the "rule
// of three" reasoning. Business logic (search/filter state, facet shaping,
// selection) lives in useMinoritySearch/useMinorityFacets/useSelectedMinority
// — this component is presentation only, per apps/web/RULES.md rule 7.
export function MinoritiesResultsPanel() {
    const {
        filters,
        page,
        sort,
        setArrayFilter,
        setHasSubgroups,
        setSort,
        resetFilters,
        setPage,
        hits,
        facetDistribution,
        estimatedTotalHits,
        pageCount,
    } = useMinoritySearch()
    const facets = useMinorityFacets(facetDistribution)
    const {selectedQid, minority, loading: selectedLoading, select} = useSelectedMinority(hits)

    // Memoized so usePageChatContextPublisher's effect only re-publishes when
    // this content actually changes, not on every unrelated render (e.g.
    // clicking a row to select it).
    const pageContextLines = useMemo(
        () => [
            `Minorities results currently open (page ${page} of ${pageCount}, ~${estimatedTotalHits} groups match the current filters):`,
            ...hits.map(summarizeMinorityRow),
        ],
        [hits, page, pageCount, estimatedTotalHits],
    )
    usePageChatContextPublisher(pageContextLines)

    return (
        <Box sx={{width: '80%', mx: 'auto', height: '100%', display: 'flex', gap: 3}}>
            <FacetSidebar>
                {/* The control facet (toggle, not a checkbox list) comes first —
                    distinct enough in kind from the FacetSections below that it
                    reads as a filter you tune, not one you tick through. */}
                <Paper variant="outlined" sx={{p: 2}}>
                    <FormControlLabel
                        control={<Switch checked={filters.has_subgroups} onChange={(e) => setHasSubgroups(e.target.checked)} />}
                        label={<Text variant="body2">Has documented subgroups</Text>}
                        sx={{ml: 0}}
                    />
                </Paper>

                {facets.primary.map((facet) => (
                    <FacetSection
                        key={facet.field}
                        label={facet.label}
                        options={facet.options}
                        value={filters[facet.field]}
                        onChange={(value) => setArrayFilter(facet.field, value)}
                    />
                ))}

                {facets.secondary.map((facet) => (
                    <FacetSection
                        key={facet.field}
                        label={facet.label}
                        options={facet.options}
                        value={filters[facet.field]}
                        onChange={(value) => setArrayFilter(facet.field, value)}
                    />
                ))}
            </FacetSidebar>

            <Box sx={{flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2}}>
                <FilterBar>
                    <Tooltip title="Reset all filters">
                        <IconButton size="small" onClick={resetFilters} aria-label="Reset all filters">
                            <RestartAltIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    {facets.primary.map((facet) => (
                        <FilterMenuButton
                            key={facet.field}
                            label={facet.label}
                            options={facet.options}
                            value={filters[facet.field]}
                            onChange={(value) => setArrayFilter(facet.field, value)}
                        />
                    ))}
                </FilterBar>

                <Box sx={{flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 3}}>
                    <Box sx={{flex: '1 1 0'}}>
                        <PaginatedList
                            header={<ResultsHeader count={estimatedTotalHits} sort={sort} onSortChange={setSort} />}
                            items={hits}
                            getItemKey={(item) => item.qid}
                            renderItem={(item) => (
                                <MinorityResultRow minority={item} selected={item.qid === selectedQid} onSelect={select} />
                            )}
                            page={page}
                            pageCount={pageCount}
                            onPageChange={setPage}
                        />
                    </Box>

                    <Box sx={{flex: '1 1 0'}}>
                        <TabbedPanel
                            tabs={[
                                {
                                    value: 'overview',
                                    label: 'Overview',
                                    content: minority ? (
                                        <MinorityOverviewTab minority={minority} />
                                    ) : (
                                        <EmptyTabMessage
                                            message={selectedLoading ? 'Loading…' : 'Select a group to see its details.'}
                                        />
                                    ),
                                },
                                {
                                    value: 'subgroups',
                                    label: 'Subgroups',
                                    content: minority ? (
                                        <MinoritySubgroupsTab minority={minority} />
                                    ) : (
                                        <EmptyTabMessage
                                            message={selectedLoading ? 'Loading…' : 'Select a group to see its subgroups.'}
                                        />
                                    ),
                                },
                            ]}
                        />
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}
