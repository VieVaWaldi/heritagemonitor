'use client'

import {useState} from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import Popover from '@mui/material/Popover'
import Tooltip from '@mui/material/Tooltip'
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
    /**
     * Set when the OPTIONS are produced by a server for the text typed here
     * (a facet with thousands of values). The list is then shown as given —
     * filtering it again locally would hide values the server just found —
     * and every keystroke is reported so the caller can fetch.
     */
    onSearchTextChange?: (text: string) => void
    loading?: boolean
}

/** What the trigger says once something is picked: the values, not just a count. */
function selectionSummary(options: FilterOption[], value: string[]): string {
    const labels = value.map((selected) => options.find((option) => option.value === selected)?.label ?? selected)
    return labels.join(', ')
}

const ROW_HEIGHT = 40
const PANEL_WIDTH = 300
// A pill wide enough to be readable, narrow enough that several fit on one row.
const TRIGGER_MAX_WIDTH = 260
const PANEL_MAX_HEIGHT = 320

// Collapsed pill button (just the filter's name + a count once something's
// selected) that opens a popover with a search field on top and a
// checkbox list below — the search filters that list, it doesn't pick
// between filters. Same row styling (ButtonBase + hover tint) as
// CorpusPanel/EntitySelector's own floating option lists, for one
// consistent "floating picker" look across the app.
export function FilterMenuButton({
    label,
    options,
    value,
    onChange,
    searchPlaceholder,
    onSearchTextChange,
    loading,
}: FilterMenuButtonProps) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
    const [searchText, setSearchText] = useState('')

    const open = Boolean(anchorEl)
    const hasSelection = value.length > 0
    const summary = hasSelection ? selectionSummary(options, value) : ''
    const filteredOptions = onSearchTextChange
        ? options
        : options.filter((option) => option.label.toLowerCase().includes(searchText.toLowerCase()))

    function handleSearchText(next: string) {
        setSearchText(next)
        onSearchTextChange?.(next)
    }

    function handleClose() {
        setAnchorEl(null)
        handleSearchText('')
    }

    function toggleOption(optionValue: string) {
        onChange(
            value.includes(optionValue) ? value.filter((v) => v !== optionValue) : [...value, optionValue],
        )
    }

    return (
        <>
            <Tooltip title={hasSelection ? `${label}: ${summary}` : ''} disableHoverListener={!hasSelection} describeChild>
            <Button
                variant="outlined"
                size="small"
                onClick={(e) => setAnchorEl(e.currentTarget)}
                endIcon={<KeyboardArrowDownIcon fontSize="small" />}
                aria-haspopup="listbox"
                aria-expanded={open}
                sx={[
                    {
                        borderRadius: '50px',
                        fontWeight: 500,
                        // Without a ceiling a picked "NATIONAL_INSTITUTE_OF_…"
                        // stretches the pill across the bar and shoves its
                        // neighbours into each other; without the crop the
                        // text spills out of it.
                        maxWidth: TRIGGER_MAX_WIDTH,
                        '& .MuiButton-label, & > span': {minWidth: 0},
                    },
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
                <Box
                    component="span"
                    sx={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0}}
                >
                    {label}
                    {hasSelection ? `: ${summary}` : ''}
                </Box>
            </Button>
            </Tooltip>

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
                        onSearch={handleSearchText}
                        onClear={() => handleSearchText('')}
                        placeholder={searchPlaceholder ?? 'Search...'}
                        size="small"
                        autoFocus
                    />
                </Box>

                <Divider />

                <Box sx={{maxHeight: PANEL_MAX_HEIGHT, overflowY: 'auto', py: 0.5}}>
                    {filteredOptions.length === 0 && (
                        <Text variant="body2" color="text.secondary" sx={{px: 2, py: 1.5}}>
                            {loading ? 'Searching…' : 'No matches.'}
                        </Text>
                    )}
                    {filteredOptions.map((option) => {
                        const selected = value.includes(option.value)
                        return (
                            // Same reasoning as the trigger: crop the row and
                            // put the whole value in a tooltip that hover and
                            // keyboard focus both reach.
                            <Tooltip key={option.value} title={option.label} describeChild enterDelay={400}>
                            <ButtonBase
                                role="option"
                                aria-selected={selected}
                                onClick={() => toggleOption(option.value)}
                                sx={(theme) => ({
                                    width: '100%',
                                    height: ROW_HEIGHT,
                                    justifyContent: 'flex-start',
                                    gap: 1,
                                    px: 1.5,
                                    minWidth: 0,
                                    backgroundColor: 'transparent',
                                    '&:hover': {backgroundColor: alpha(theme.palette.primary.main, 0.08)},
                                })}
                            >
                                <Checkbox
                                    checked={selected}
                                    icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                                    checkedIcon={<CheckBoxIcon fontSize="small" />}
                                    size="small"
                                    sx={{p: 0, flexShrink: 0}}
                                    tabIndex={-1}
                                />
                                <Text variant="body2" truncate>
                                    {option.label}
                                </Text>
                                {option.count != null && (
                                    <Text variant="caption" color="text.secondary" sx={{ml: 'auto', flexShrink: 0}}>
                                        {option.count}
                                    </Text>
                                )}
                            </ButtonBase>
                            </Tooltip>
                        )
                    })}
                </Box>
            </Popover>
        </>
    )
}
