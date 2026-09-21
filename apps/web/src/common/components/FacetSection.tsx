'use client'

import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Checkbox from '@mui/material/Checkbox'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import {alpha} from '@mui/material/styles'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import {Text} from '@/common/text'
import type {FilterOption} from './FilterMenuButton'

export interface FacetSectionProps {
    label: string
    options: FilterOption[]
    value: string[]
    onChange: (value: string[]) => void
}

const ROW_HEIGHT = 28
// Rows beyond this scroll instead of growing the card indefinitely — tweak
// this to change how many options show before scrolling kicks in.
const MAX_VISIBLE_OPTIONS = 6

// One facet as its own bordered card — same Paper treatment as
// PaginatedList/TabbedPanel/FilterBar — rather than one shared box, so
// FacetSidebar can stack several without them fusing into a single tall
// block. Rows reuse FilterMenuButton's checkbox styling, just always
// visible instead of tucked behind a click.
export function FacetSection({label, options, value, onChange}: FacetSectionProps) {
    function toggleOption(optionValue: string) {
        onChange(value.includes(optionValue) ? value.filter((v) => v !== optionValue) : [...value, optionValue])
    }

    return (
        <Paper variant="outlined" sx={{p: 2}}>
            <Text variant="overline" color="text.secondary" sx={{fontWeight: 600, display: 'block', mb: 0.5}}>
                {label}
            </Text>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.25,
                    maxHeight: ROW_HEIGHT * MAX_VISIBLE_OPTIONS,
                    overflowY: 'auto',
                    // Extends into Paper's own right padding (mr) then re-adds it
                    // as this box's own (pr), so the scrollbar — which renders
                    // flush with this box's edge — lands on the card's actual
                    // border instead of sitting inset from it.
                    mr: -2,
                    pr: 2,
                }}
            >
                {options.map((option) => {
                    const selected = value.includes(option.value)
                    return (
                        // Labels are truncated to keep the column narrow, so
                        // the full text has to be reachable some other way:
                        // the tooltip opens on hover AND on keyboard focus
                        // (the row is a ButtonBase, so it is in the tab
                        // order), and `describeChild` lets a screen reader
                        // read the row's own text rather than replacing it.
                        <Tooltip key={option.value} title={option.label} describeChild enterDelay={400}>
                        <ButtonBase
                            role="option"
                            aria-selected={selected}
                            onClick={() => toggleOption(option.value)}
                            sx={(theme) => ({
                                width: '100%',
                                height: ROW_HEIGHT,
                                flexShrink: 0,
                                justifyContent: 'space-between',
                                gap: 1,
                                px: 1,
                                mx: -1,
                                borderRadius: 1,
                                backgroundColor: 'transparent',
                                '&:hover': {backgroundColor: alpha(theme.palette.primary.main, 0.08)},
                            })}
                        >
                            <Box sx={{display: 'flex', alignItems: 'center', gap: 1, minWidth: 0}}>
                                <Checkbox
                                    checked={selected}
                                    icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                                    checkedIcon={<CheckBoxIcon fontSize="small" />}
                                    size="small"
                                    sx={{p: 0}}
                                    tabIndex={-1}
                                />
                                <Text variant="body2" truncate>
                                    {option.label}
                                </Text>
                            </Box>
                            {option.count != null && (
                                <Text variant="caption" color="text.secondary" sx={{flexShrink: 0}}>
                                    {option.count}
                                </Text>
                            )}
                        </ButtonBase>
                        </Tooltip>
                    )
                })}
            </Box>
        </Paper>
    )
}
