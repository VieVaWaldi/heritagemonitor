'use client'

import type {YearRange} from '@heritagemonitor/shared'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import {useState} from 'react'
import {Text} from '@/common/text'
import {DualSlider} from './DualSlider'

export interface YearFilterProps {
    /** The range currently filtered on, or null for "all years". */
    value: YearRange | null
    onChange: (value: YearRange | null) => void
    /** Converts a preset into a range — "last n years", current year included. */
    onLastNYears: (n: number) => void
    min: number
    max: number
    /**
     * Year -> number of matching documents, from the api's histogram
     * aggregation. Drawn behind the slider so the range being chosen can be
     * seen against where the data actually is.
     */
    histogram?: Record<string, number>
}

/** Presets offered as one-click chips; anything else goes through "last n". */
const PRESETS = [1, 2, 3, 5] as const

const HISTOGRAM_HEIGHT = 40

function presetLabel(years: number): string {
    return years === 1 ? 'Last year' : `Last ${years} years`
}

/**
 * The histogram behind the slider: one bar per year, height relative to the
 * busiest year, dimmed outside the selected range. Deliberately plain divs
 * rather than a charting library — it carries no axes, labels or interaction
 * of its own, it is a backdrop that says "the data is over here", and a chart
 * component would bring layout and theming fights for no added meaning.
 */
function YearHistogram({histogram, min, max, selected}: {histogram: Record<string, number>; min: number; max: number; selected: YearRange | null}) {
    const years: number[] = []
    for (let year = min; year <= max; year += 1) years.push(year)

    const peak = Math.max(1, ...years.map((year) => histogram[String(year)] ?? 0))

    return (
        <Box sx={{display: 'flex', alignItems: 'flex-end', gap: '1px', height: HISTOGRAM_HEIGHT, mb: 0.5}}>
            {years.map((year) => {
                const count = histogram[String(year)] ?? 0
                const inRange = !selected || (year >= selected.from && year <= selected.to)
                return (
                    <Tooltip key={year} title={`${year}: ${count.toLocaleString('en-US')}`} disableInteractive>
                        <Box
                            sx={{
                                flex: '1 1 0',
                                minWidth: 0,
                                // A matching year with very few documents should
                                // still be visible as more than nothing.
                                height: count > 0 ? `${Math.max(8, (count / peak) * 100)}%` : '1px',
                                borderRadius: '1px 1px 0 0',
                                backgroundColor: inRange ? 'primary.main' : 'action.disabledBackground',
                                opacity: inRange ? 0.55 : 1,
                            }}
                        />
                    </Tooltip>
                )
            })}
        </Box>
    )
}

/**
 * The year filter used by every entity that has one (projects now; works,
 * experts, funding and the networks later, which is why it lives in
 * common/components rather than in the projects module).
 *
 * Three ways to say the same thing, all ending in one range: preset chips,
 * a "last n years" number field, and the slider for a custom span. A preset
 * is stored as the range it means, never as "last 2 years", so a copied link
 * still means those years next January.
 */
export function YearFilter({value, onChange, onLastNYears, min, max, histogram}: YearFilterProps) {
    const [customYears, setCustomYears] = useState('')

    // The slider's live position while a drag is in progress. The committed
    // value (and therefore the URL, the api request and the history entry)
    // only changes when the drag ends — dragging across 80 years would
    // otherwise fire 80 searches and 80 back-button steps.
    const [dragRange, setDragRange] = useState<[number, number] | null>(null)
    const sliderValue: [number, number] = dragRange ?? [value?.from ?? min, value?.to ?? max]
    // Reflect the drag in the histogram highlight and the chip, so what is
    // being chosen is visible before it is committed.
    const previewRange: YearRange | null = dragRange ? {from: dragRange[0], to: dragRange[1]} : value

    function commit([from, to]: [number, number]) {
        setDragRange(null)
        // The full span means "no year filter" rather than a filter that
        // happens to match everything — it keeps the URL and the chip clean.
        onChange(from <= min && to >= max ? null : {from, to})
    }

    function applyCustom(text: string) {
        const n = Number(text)
        if (Number.isInteger(n) && n >= 1 && n <= max - min + 1) onLastNYears(n)
    }

    return (
        <Paper variant="outlined" sx={{p: 2}}>
            <Box sx={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, mb: 1}}>
                <Text variant="overline" color="text.secondary" sx={{fontWeight: 600}}>
                    Year
                </Text>
                {previewRange && (
                    <Chip
                        label={`${previewRange.from}–${previewRange.to}`}
                        size="small"
                        onDelete={() => onChange(null)}
                        color="primary"
                        variant="outlined"
                    />
                )}
            </Box>

            <Stack direction="row" sx={{flexWrap: 'wrap', gap: 0.75, mb: 1.5}}>
                {PRESETS.map((years) => (
                    <Chip
                        key={years}
                        label={presetLabel(years)}
                        size="small"
                        variant="outlined"
                        onClick={() => onLastNYears(years)}
                    />
                ))}
                <TextField
                    value={customYears}
                    onChange={(event) => setCustomYears(event.target.value.replace(/\D/gu, ''))}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') applyCustom(customYears)
                    }}
                    onBlur={() => applyCustom(customYears)}
                    placeholder="n"
                    size="small"
                    inputMode="numeric"
                    aria-label="Last n years"
                    sx={{width: 84, '& .MuiInputBase-input': {py: 0.5, fontSize: '0.8125rem'}}}
                    slotProps={{input: {endAdornment: <Text variant="caption" color="text.secondary">yrs</Text>}}}
                />
            </Stack>

            {histogram && Object.keys(histogram).length > 0 && (
                <YearHistogram histogram={histogram} min={min} max={max} selected={previewRange} />
            )}

            <DualSlider
                min={min}
                max={max}
                value={sliderValue}
                onChange={setDragRange}
                onChangeCommitted={commit}
                fromLabel="From"
                toLabel="To"
            />
        </Paper>
    )
}
