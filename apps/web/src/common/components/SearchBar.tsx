'use client'

import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField, {type TextFieldProps} from '@mui/material/TextField'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import {fluidUnit} from '@/common/theme/fluidUnit'
import {ACTION_BAR_BORDER_WIDTH, ACTION_BAR_BORDER_COLOR, ACTION_BAR_BORDER_HOVER_COLOR} from './actionBarStyle'

const PILL_RADIUS = '50px'

export interface SearchBarProps extends Omit<TextFieldProps, 'variant' | 'InputProps'> {
    value?: string
    onSearch?: (value: string) => void
    onSearchStart?: (key: string) => void
    onClear?: () => void
    /** Which corners get the pill radius. Defaults to all four — a standalone
     * bar. ActionBar uses "start" so it butts squarely against its neighbor. */
    roundedCorners?: 'all' | 'start' | 'end'
}

export function SearchBar({
    value,
    placeholder = 'Search...',
    onSearch,
    onSearchStart,
    onClear,
    roundedCorners = 'all',
    sx,
    ...props
}: SearchBarProps) {
    const borderRadius = {
        borderTopLeftRadius: roundedCorners !== 'end' ? PILL_RADIUS : 0,
        borderBottomLeftRadius: roundedCorners !== 'end' ? PILL_RADIUS : 0,
        borderTopRightRadius: roundedCorners !== 'start' ? PILL_RADIUS : 0,
        borderBottomRightRadius: roundedCorners !== 'start' ? PILL_RADIUS : 0,
    }

    return (
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
                                    '&:hover': {backgroundColor: value ? undefined : 'transparent'},
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
    )
}
