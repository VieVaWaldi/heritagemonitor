'use client'

import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import {RankingButton, type RankingOption} from '@/common/components'
import {Text} from '@/common/text'
import {formatTotal} from './searchState'

export interface ResultsHeaderProps<TSort extends string> {
    total: number
    /** True when the api could only count up to its cap — rendered as "10,000+". */
    totalCapped: boolean
    /** Plural noun for this entity, e.g. "projects". */
    noun: string
    sortOptions: readonly RankingOption<TSort>[]
    sort: TSort | null
    onSortChange: (value: TSort | null) => void
}

/**
 * Count on the left, ranking on the right — the header slot of every entity's
 * PaginatedList. The count is the one place "10,000+" is explained to the
 * user: beyond that the api stops counting, and pretending to know the exact
 * number would be a lie about 50M documents.
 */
export function ResultsHeader<TSort extends string>({
    total,
    totalCapped,
    noun,
    sortOptions,
    sort,
    onSortChange,
}: ResultsHeaderProps<TSort>) {
    return (
        <Box sx={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1}}>
            <Tooltip
                title={totalCapped ? 'Counting stops at 10,000 — narrow the search for an exact number' : ''}
                disableHoverListener={!totalCapped}
            >
                <Text variant="body2" color="text.secondary">
                    {formatTotal(total, totalCapped)} {noun}
                </Text>
            </Tooltip>
            <RankingButton options={sortOptions} value={sort} onChange={onSortChange} />
        </Box>
    )
}
