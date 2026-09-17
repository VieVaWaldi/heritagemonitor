'use client'

import {useState} from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import Popover from '@mui/material/Popover'
import {alpha} from '@mui/material/styles'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import {SearchBar} from './SearchBar'
import {Text} from '@/common/text'

export interface FilterOption {
    value: string
    label: string
    /** Result count for this option — shown by FacetSection; unused here. */
    count?: number
}

export interface FilterMenuButtonProps {
    /** Shown on the collapsed trigger — the filter's name, e.g. "Year". */
    label: string
    options: FilterOption[]
    value: string[]
    onChange: (value: string[]) => void
    searchPlaceholder?: string
}

const ROW_HEIGHT = 40
const PANEL_WIDTH = 260
const PANEL_MAX_HEIGHT = 320

// Collapsed pill button (just the filter's name + a count once something's
// selected) that opens a popover with a search field on top and a
// checkbox list below — the search filters that list, it doesn't pick
// between filters. Same row styling (ButtonBase + hover tint) as
// CorpusPanel/EntitySelector's own floating option lists, for one
// consistent "floating picker" look across the app.
export function FilterMenuButton({label, options, value, onChange, searchPlaceholder}: FilterMenuButtonProps) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
    const [searchText, setSearchText] = useState('')

    const open = Boolean(anchorEl)
    const hasSelection = value.length > 0
    const filteredOptions = options.filter((option) =>
        option.label.toLowerCase().includes(searchText.toLowerCase()),
    )

    function handleClose() {
        setAnchorEl(null)
        setSearchText('')
    }

    function toggleOption(optionValue: string) {
        onChange(
            value.includes(optionValue) ? value.filter((v) => v !== optionValue) : [...value, optionValue],
        )
    }

    return (
        <>
            <Button
                variant="outlined"
                size="small"
                onClick={(e) => setAnchorEl(e.currentTarget)}
                endIcon={<KeyboardArrowDownIcon fontSize="small" />}
                aria-haspopup="listbox"
                aria-expanded={open}
                sx={[
                    {borderRadius: '50px', fontWeight: 500},
                    hasSelection
                        ? {
                              backgroundColor: 'primary.main',
                              color: 'primary.contrastText',
                              borderColor: 'primary.main',
                              '&:hover': {backgroundColor: 'primary.dark', borderColor: 'primary.dark'},
                          }
                        : {
                              color: 'text.primary',
                              borderColor: 'divider',
                              '&:hover': {backgroundColor: 'action.hover', borderColor: 'text.secondary'},
                          },
                ]}
            >
                {label}
                {hasSelection ? ` (${value.length})` : ''}
            </Button>

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{vertical: 'bottom', horizontal: 'left'}}
                slotProps={{
                    paper: {
                        sx: {mt: 1, width: PANEL_WIDTH, border: 1, borderColor: 'divider', boxShadow: 2},
                    },
                }}
            >
                <Box sx={{p: 1}}>
                    <SearchBar
                        value={searchText}
                        onSearch={setSearchText}
                        onClear={() => setSearchText('')}
                        placeholder={searchPlaceholder ?? 'Search...'}
                        size="small"
                        autoFocus
                    />
                </Box>

                <Divider />

                <Box sx={{maxHeight: PANEL_MAX_HEIGHT, overflowY: 'auto', py: 0.5}}>
                    {filteredOptions.length === 0 && (
                        <Text variant="body2" color="text.secondary" sx={{px: 2, py: 1.5}}>
                            No matches.
                        </Text>
                    )}
                    {filteredOptions.map((option) => {
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
                                    justifyContent: 'flex-start',
                                    gap: 1,
                                    px: 1.5,
                                    backgroundColor: 'transparent',
                                    '&:hover': {backgroundColor: alpha(theme.palette.primary.main, 0.08)},
                                })}
                            >
                                <Checkbox
                                    checked={selected}
                                    icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                                    checkedIcon={<CheckBoxIcon fontSize="small" />}
                                    size="small"
                                    sx={{p: 0}}
                                    tabIndex={-1}
                                />
                                <Text variant="body2">{option.label}</Text>
                            </ButtonBase>
                        )
                    })}
                </Box>
            </Popover>
        </>
    )
}
