'use client'

import {useState} from 'react'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField, {type TextFieldProps} from '@mui/material/TextField'
import {alpha} from '@mui/material/styles'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import {Text} from '@/common/text'
import {fluidUnit} from '@/common/theme/fluidUnit'
import {
    ACTION_BAR_BORDER_WIDTH,
    ACTION_BAR_BORDER_COLOR,
    ACTION_BAR_BORDER_HOVER_COLOR,
} from './actionBarStyle'

const PILL_RADIUS = '50px'
// Deliberately not PILL_RADIUS — on a box this much taller than the bar
// itself, the bar's full pill curve reads as oddly bulbous. Still rounded,
// just to the app's normal card radius (CorpusPanel/EntitySelector's own
// floating panels use the same value).
const SUGGESTIONS_PANEL_RADIUS = 34
const SUGGESTION_ROW_HEIGHT = 40
const SUGGESTIONS_PANEL_GAP = 1
const DEFAULT_MAX_SUGGESTION_ROWS = 6

export interface SearchBarProps extends Omit<TextFieldProps, 'variant' | 'InputProps'> {
    value?: string
    onSearch?: (value: string) => void
    onSearchStart?: (key: string) => void
    onClear?: () => void
    /** Which corners get the pill radius. Defaults to all four — a standalone
     * bar. ActionBar uses "start" so it butts squarely against its neighbor. */
    roundedCorners?: 'all' | 'start' | 'end'
    /** Shown in a floating panel below the bar while it's focused — same
     * width and pill styling as the bar itself. Omit for a plain bar with
     * no dropdown. */
    suggestions?: string[]
    /** Called when a suggestion is clicked. Defaults to onSearch, so the
     * common case (selecting a suggestion just fills the bar) needs no
     * extra wiring. */
    onSuggestionSelect?: (value: string) => void
    /** Rows visible before the panel scrolls instead of growing further.
     * Defaults to 6. */
    maxSuggestionRows?: number
}

export function SearchBar({
    value,
    placeholder = 'Search...',
    onSearch,
    onSearchStart,
    onClear,
    roundedCorners = 'all',
    suggestions,
    onSuggestionSelect,
    maxSuggestionRows = DEFAULT_MAX_SUGGESTION_ROWS,
    sx,
    ...props
}: SearchBarProps) {
    const [open, setOpen] = useState(false)
    const hasSuggestions = Boolean(suggestions && suggestions.length > 0)

    function handleSuggestionSelect(suggestion: string) {
        setOpen(false)
        if (onSuggestionSelect) onSuggestionSelect(suggestion)
        else onSearch?.(suggestion)
    }

    const borderRadius = {
        borderTopLeftRadius: roundedCorners !== 'end' ? PILL_RADIUS : 0,
        borderBottomLeftRadius: roundedCorners !== 'end' ? PILL_RADIUS : 0,
        borderTopRightRadius: roundedCorners !== 'start' ? PILL_RADIUS : 0,
        borderBottomRightRadius: roundedCorners !== 'start' ? PILL_RADIUS : 0,
    }

    return (
        <Box sx={{position: 'relative'}}>
            <TextField
                fullWidth
                value={value}
                placeholder={placeholder}
                variant="outlined"
                onChange={(e) => onSearch?.(e.target.value)}
                onKeyDown={(e) => onSearchStart?.(e.key)}
                sx={[
                    {
                        '& .MuiOutlinedInput-root': {
                            ...borderRadius,
                            backgroundColor: 'transparent',
                            fontSize: fluidUnit(1.05),
                            '& fieldset': {
                                borderColor: ACTION_BAR_BORDER_COLOR,
                                borderWidth: ACTION_BAR_BORDER_WIDTH,
                            },
                            '&:hover fieldset': {borderColor: ACTION_BAR_BORDER_HOVER_COLOR},
                            '&.Mui-focused fieldset': {
                                borderColor: ACTION_BAR_BORDER_COLOR,
                                borderWidth: ACTION_BAR_BORDER_WIDTH,
                            },
                        },
                        '& .MuiOutlinedInput-input': {py: fluidUnit(1), px: fluidUnit(0.5)},
                    },
                    ...(Array.isArray(sx) ? sx : [sx]),
                ]}
                onFocus={() => hasSuggestions && setOpen(true)}
                onBlur={() => setOpen(false)}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <IconButton
                                    onClick={value ? onClear : undefined}
                                    size="small"
                                    disableRipple={!value}
                                    sx={{
                                        ml: 0.5,
                                        cursor: value ? 'pointer' : 'default',
                                        '&:hover': {
                                            backgroundColor: value ? undefined : 'transparent',
                                        },
                                    }}
                                >
                                    {value ? (
                                        <ClearIcon sx={{color: 'primary.main'}} />
                                    ) : (
                                        <SearchIcon sx={{color: 'primary.main'}} />
                                    )}
                                </IconButton>
                            </InputAdornment>
                        ),
                    },
                }}
                {...props}
            />

            {hasSuggestions && (
                <Box
                    role="listbox"
                    sx={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        pt: SUGGESTIONS_PANEL_GAP,
                        opacity: open ? 1 : 0,
                        visibility: open ? 'visible' : 'hidden',
                        pointerEvents: open ? 'auto' : 'none',
                        transition: 'opacity 150ms ease',
                        zIndex: (theme) => theme.zIndex.appBar,
                    }}
                >
                    <Box
                        sx={{
                            borderRadius: `${SUGGESTIONS_PANEL_RADIUS}px`,
                            backgroundColor: 'background.paper',
                            border: ACTION_BAR_BORDER_WIDTH,
                            borderColor: ACTION_BAR_BORDER_COLOR,
                            boxShadow: 2,
                            overflowX: 'hidden',
                            overflowY: 'auto',
                            maxHeight: SUGGESTION_ROW_HEIGHT * maxSuggestionRows,
                            py: 0.5,
                        }}
                    >
                        {suggestions!.map((suggestion) => (
                            <ButtonBase
                                key={suggestion}
                                role="option"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleSuggestionSelect(suggestion)}
                                sx={(theme) => ({
                                    width: '100%',
                                    height: SUGGESTION_ROW_HEIGHT,
                                    justifyContent: 'flex-start',
                                    gap: 1.5,
                                    px: fluidUnit(1.5),
                                    '&:hover': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                    },
                                })}
                            >
                                <SearchIcon fontSize="small" sx={{color: 'text.secondary'}} />
                                <Text variant="body2">{suggestion}</Text>
                            </ButtonBase>
                        ))}
                    </Box>
                </Box>
            )}
        </Box>
    )
}
