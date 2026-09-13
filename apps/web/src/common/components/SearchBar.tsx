'use client'

import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Select, {type SelectChangeEvent} from '@mui/material/Select'
import TextField, {type TextFieldProps} from '@mui/material/TextField'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import ScienceIcon from '@mui/icons-material/Science'
import DescriptionIcon from '@mui/icons-material/Description'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import type {ReactNode} from 'react'

export interface EntityOption {
    value: string
    label: string
    icon?: ReactNode
}

// Default option sets a caller can override via `entityOptions` — not
// page copy, so not routed through i18n (see apps/web/src/common/mui's
// porting notes).
export const ENTITY_OPTIONS_MAP: EntityOption[] = [
    {value: 'projects', label: 'Projects', icon: <ScienceIcon fontSize="small" />},
    {value: 'institutions', label: 'Institutions', icon: <AccountBalanceIcon fontSize="small" />},
]

export const ENTITY_OPTIONS_LIST: EntityOption[] = [
    {value: 'projects', label: 'Projects', icon: <ScienceIcon fontSize="small" />},
    {value: 'expertise', label: 'Expertise', icon: <WorkspacePremiumIcon fontSize="small" />},
    {value: 'works', label: 'Works', icon: <DescriptionIcon fontSize="small" />},
    {value: 'institutions', label: 'Institutions', icon: <AccountBalanceIcon fontSize="small" />},
]

export interface SearchBarProps extends Omit<TextFieldProps, 'variant' | 'InputProps'> {
    value?: string
    onSearch?: (value: string) => void
    onSearchStart?: (key: string) => void
    onClear?: () => void
    entityOptions?: EntityOption[]
    selectedEntity?: string
    onEntityChange?: (value: string) => void
    /** Reverses layout: entity selector on the left, search icon on the right */
    reverseLayout?: boolean
}

export function SearchBar({
    value,
    placeholder = 'Search...',
    onSearch,
    onSearchStart,
    onClear,
    entityOptions,
    selectedEntity,
    onEntityChange,
    reverseLayout = false,
    sx,
    ...props
}: SearchBarProps) {
    const selectedOption = entityOptions?.find((opt) => opt.value === selectedEntity)

    const handleEntityChange = (event: SelectChangeEvent<string>) => {
        onEntityChange?.(event.target.value)
    }

    const entitySelect = (position: 'start' | 'end') => (
        <Select
            value={selectedEntity || ''}
            onChange={handleEntityChange}
            variant="standard"
            disableUnderline
            IconComponent={KeyboardArrowDownIcon}
            renderValue={() => (
                <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5}}>
                    {selectedOption?.icon && (
                        <Box sx={{display: 'flex', alignItems: 'center', color: 'text.secondary'}}>
                            {selectedOption.icon}
                        </Box>
                    )}
                    {selectedOption?.label}
                </Box>
            )}
            sx={{
                minWidth: 100,
                [position === 'start' ? 'ml' : 'mr']: 1,
                '& .MuiSelect-select': {py: 0.5, pr: 3, display: 'flex', alignItems: 'center'},
                '& .MuiSvgIcon-root': {color: 'text.secondary'},
            }}
        >
            {entityOptions?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                        {option.icon && (
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: 'text.secondary',
                                }}
                            >
                                {option.icon}
                            </Box>
                        )}
                        {option.label}
                    </Box>
                </MenuItem>
            ))}
        </Select>
    )

    const clearOrSearchButton = (marginSide: 'ml' | 'mr') => (
        <IconButton
            onClick={value ? onClear : undefined}
            size="small"
            disableRipple={!value}
            sx={{
                [marginSide]: 0.5,
                cursor: value ? 'pointer' : 'default',
                '&:hover': {backgroundColor: value ? undefined : 'transparent'},
            }}
        >
            {value ? <ClearIcon /> : <SearchIcon sx={{color: 'text.secondary'}} />}
        </IconButton>
    )

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
                        borderRadius: '50px',
                        backgroundColor: 'transparent',
                        '& fieldset': {borderColor: 'divider'},
                        '&:hover fieldset': {borderColor: 'text.secondary'},
                        '&.Mui-focused fieldset': {borderColor: 'primary.main', borderWidth: 1},
                    },
                    '& .MuiOutlinedInput-input': {py: 1.5, px: 1},
                },
                ...(Array.isArray(sx) ? sx : [sx]),
            ]}
            slotProps={{
                input: {
                    startAdornment:
                        reverseLayout && entityOptions && entityOptions.length > 0 ? (
                            <InputAdornment position="start">
                                {entitySelect('start')}
                                <Divider orientation="vertical" flexItem sx={{mx: 1}} />
                            </InputAdornment>
                        ) : (
                            <InputAdornment position="start">
                                {clearOrSearchButton('ml')}
                            </InputAdornment>
                        ),
                    endAdornment: reverseLayout ? (
                        <InputAdornment position="end">{clearOrSearchButton('mr')}</InputAdornment>
                    ) : entityOptions && entityOptions.length > 0 ? (
                        <InputAdornment position="end">
                            <Divider orientation="vertical" flexItem sx={{mx: 1}} />
                            {entitySelect('end')}
                        </InputAdornment>
                    ) : undefined,
                },
            }}
            {...props}
        />
    )
}
