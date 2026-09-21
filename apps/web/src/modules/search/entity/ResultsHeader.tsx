'use client'

import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import {RankingButton, type RankingOption} from '@/common/components'
import {Text} from '@/common/text'
import {formatResultCount, type ResultCount} from './searchState'

export interface ResultsHeaderProps<TSort extends string> {
    count: ResultCount
    /** Plural noun for this entity, e.g. "projects". */
    noun: string
    sortOptions: readonly RankingOption<TSort>[]
    sort: TSort | null
    onSortChange: (value: TSort | null) => void
}

/**
 * Count on the left, ranking on the right — the header slot of every entity's
 * PaginatedList. The count is where the api's two-part answer is explained to
 * the user: the search itself stops counting at 10,000, so beyond that the
 * number comes from a separate `_count` and is shown as a magnitude ("about
 * 3.7M"), never as a precise figure it is not.
 */
export function ResultsHeader<TSort extends string>({count, noun, sortOptions, sort, onSortChange}: ResultsHeaderProps<TSort>) {
    const approximate = count.totalCapped
    const tooltip = !approximate
        ? ''
        : count.approxTotal != null
          ? 'The search stops counting at 10,000; this total comes from a separate, rounded count'
          : 'The search stops counting at 10,000 — narrow it down for an exact number'

    return (
        <Box sx={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1}}>
            <Tooltip title={tooltip} disableHoverListener={!approximate}>
                <Text variant="body2" color="text.secondary">
                    {formatResultCount(count)} {noun}
                </Text>
            </Tooltip>
            <RankingButton options={sortOptions} value={sort} onChange={onSortChange} />
        </Box>
    )
}
