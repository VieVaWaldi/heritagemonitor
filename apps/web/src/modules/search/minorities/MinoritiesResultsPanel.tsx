'use client'

import {useMemo} from 'react'
import type {MinorityDto} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import FormControlLabel from '@mui/material/FormControlLabel'
import Paper from '@mui/material/Paper'
import Switch from '@mui/material/Switch'
import {DualSlider, FacetSection, FacetSidebar, FilterBar, FilterMenuButton, PaginatedList, TabbedPanel} from '@/common/components'
import {usePageChatContextPublisher} from '@/common/llmchat/PageChatContext'
import {Text} from '@/common/text'
import {formatPopulation, labelSourceClass} from './minorityFormat'
import {MinorityOverviewTab} from './MinorityOverviewTab'
import {MinorityResultRow} from './MinorityResultRow'
import {MinoritySubgroupsTab} from './MinoritySubgroupsTab'
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

function ResultCountHeader({count}: {count: number}) {
    return (
        <Text variant="body2" color="text.secondary">
            About {count} groups
        </Text>
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

// Log-scaled: the population facet spans 7 to 133,000,000 (see
// hm_pipeline's index_meilisearch.py), so a linear slider would put every
// group under ~1M in the leftmost sliver. Slider position is log10 of the
// actual value; DualSlider itself stays linear, this just feeds it
// log-space min/max/value and converts back on change.
function toLogPosition(value: number): number {
    return Math.log10(Math.max(value, 1))
}

function fromLogPosition(position: number): number {
    return Math.round(10 ** position)
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
        setArrayFilter,
        setHasSubgroups,
        setPopulation,
        setPage,
        hits,
        facetDistribution,
        facetStats,
        estimatedTotalHits,
        pageCount,
    } = useMinoritySearch()
    const facets = useMinorityFacets(facetDistribution)
    const {selectedQid, minority, select} = useSelectedMinority()

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

    const populationStats = facetStats.population
    const populationValue = filters.population ?? (populationStats ? [populationStats.min, populationStats.max] : null)

    return (
        <Box sx={{width: '80%', mx: 'auto', height: '100%', display: 'flex', gap: 3}}>
            <FacetSidebar>
                {facets.primary.map((facet) => (
                    <FacetSection
                        key={facet.field}
                        label={facet.label}
                        options={facet.options}
                        value={filters[facet.field]}
                        onChange={(value) => setArrayFilter(facet.field, value)}
                    />
                ))}

                {populationStats && populationValue && (
                    <Paper variant="outlined" sx={{p: 2}}>
                        <Text variant="overline" color="text.secondary" sx={{fontWeight: 600, display: 'block', mb: 1}}>
                            Population
                        </Text>
                        <DualSlider
                            min={toLogPosition(populationStats.min)}
                            max={toLogPosition(populationStats.max)}
                            step={0.02}
                            value={[toLogPosition(populationValue[0]), toLogPosition(populationValue[1])]}
                            onChange={([from, to]) => setPopulation([fromLogPosition(from), fromLogPosition(to)])}
                            fromLabel="Min"
                            toLabel="Max"
                        />
                        <Text variant="caption" color="text.secondary" sx={{display: 'block', textAlign: 'center', mt: -1}}>
                            {formatPopulation(populationValue[0])} – {formatPopulation(populationValue[1])}
                        </Text>
                    </Paper>
                )}

                <Paper variant="outlined" sx={{p: 2}}>
                    <FormControlLabel
                        control={<Switch checked={filters.has_subgroups} onChange={(e) => setHasSubgroups(e.target.checked)} />}
                        label={<Text variant="body2">Has documented subgroups</Text>}
                        sx={{ml: 0}}
                    />
                </Paper>

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
                            header={<ResultCountHeader count={estimatedTotalHits} />}
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
                                        <EmptyTabMessage message="Select a group to see its details." />
                                    ),
                                },
                                {
                                    value: 'subgroups',
                                    label: 'Subgroups',
                                    content: minority ? (
                                        <MinoritySubgroupsTab minority={minority} />
                                    ) : (
                                        <EmptyTabMessage message="Select a group to see its subgroups." />
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
