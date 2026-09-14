'use client'

import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import Select, {type SelectChangeEvent} from '@mui/material/Select'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import {alpha} from '@mui/material/styles'
import {useValueChangeFlash} from '@/common/hooks/useValueChangeFlash'
import {fluidUnit} from '@/common/theme/fluidUnit'
import type {SelectorOption} from './EntitySelector'
import {ACTION_BAR_BORDER_WIDTH, ACTION_BAR_BORDER_COLOR, ACTION_BAR_BORDER_HOVER_COLOR} from './actionBarStyle'

export type {SelectorOption as CorpusOption} from './EntitySelector'

export interface CorpusSelectorProps<Key extends string = string> {
    options: SelectorOption<Key>[]
    value: Key
    onChange: (value: Key) => void
}

// Generic over the option key, same reasoning as EntitySelector
export function CorpusSelector<Key extends string = string>({
    options,
    value,
    onChange,
}: CorpusSelectorProps<Key>) {
    const selectedOption = options.find((opt) => opt.key === value)
    const isFlashing = useValueChangeFlash(value, 900)

    const handleChange = (event: SelectChangeEvent<Key>) => {
        onChange(event.target.value as Key)
    }

    return (
        <Select
            value={value}
            onChange={handleChange}
            variant="outlined"
            IconComponent={KeyboardArrowDownIcon}
            renderValue={() => (
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                    {selectedOption?.icon && (
                        <selectedOption.icon fontSize="small" sx={{color: selectedOption.color}} />
                    )}
                    {selectedOption?.label}
                </Box>
            )}
            sx={(theme) => ({
                minWidth: fluidUnit(8.75),
                backgroundColor: 'transparent',
                fontSize: fluidUnit(1.05),
                '@keyframes corpusSelectorGlow': {
                    '0%': {
                        boxShadow: `0 0 0 0 ${alpha(theme.palette.primary.main, 0.9)}`,
                        backgroundColor: alpha(theme.palette.primary.main, 0.22),
                        transform: 'scale(1)',
                    },
                    '35%': {
                        boxShadow: `0 0 0 12px ${alpha(theme.palette.primary.main, 0.45)}`,
                        backgroundColor: alpha(theme.palette.primary.main, 0.12),
                        transform: 'scale(1.03)',
                    },
                    '100%': {
                        boxShadow: `0 0 0 28px ${alpha(theme.palette.primary.main, 0)}`,
                        backgroundColor: 'transparent',
                        transform: 'scale(1)',
                    },
                },
                animation: isFlashing ? 'corpusSelectorGlow 900ms ease-out' : 'none',
                '& .MuiOutlinedInput-notchedOutline': {
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    borderTopRightRadius: '50px',
                    borderBottomRightRadius: '50px',
                    borderColor: ACTION_BAR_BORDER_COLOR,
                    borderWidth: ACTION_BAR_BORDER_WIDTH,
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {borderColor: ACTION_BAR_BORDER_HOVER_COLOR},
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: ACTION_BAR_BORDER_COLOR,
                    borderWidth: ACTION_BAR_BORDER_WIDTH,
                },
                '& .MuiSelect-select': {
                    py: fluidUnit(1),
                    pl: fluidUnit(1.25),
                    pr: fluidUnit(2.25),
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: fluidUnit(1.05),
                },
                '& .MuiSelect-icon': {color: 'primary.main'},
            })}
        >
            {options.map((option) => (
                <MenuItem key={option.key} value={option.key}>
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                        <option.icon fontSize="small" sx={{color: option.color}} />
                        {option.label}
                    </Box>
                </MenuItem>
            ))}
        </Select>
    )
}
