'use client'

import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Checkbox from '@mui/material/Checkbox'
import Paper from '@mui/material/Paper'
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

const ROW_HEIGHT = 36

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
            <Box sx={{display: 'flex', flexDirection: 'column'}}>
                {options.map((option) => {
                    const selected = value.includes(option.value)
                    return (
                        <ButtonBase
                            key={option.value}
                            role="option"
                            aria-selected={selected}
                            onClick={() => toggleOption(option.value)}
                            sx={(theme) => ({
                                width: '100%',
                                height: ROW_HEIGHT,
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
                    )
                })}
            </Box>
        </Paper>
    )
}
