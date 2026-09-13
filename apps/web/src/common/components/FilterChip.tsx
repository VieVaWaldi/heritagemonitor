'use client'

import Chip, {type ChipProps} from '@mui/material/Chip'

export interface FilterChipProps extends Omit<ChipProps, 'label' | 'color'> {
    label: string
    color: [number, number, number]
    onRemove?: () => void
}

export function FilterChip({label, color, onRemove, sx, ...props}: FilterChipProps) {
    const bgColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`

    return (
        <Chip
            label={label}
            size="small"
            onDelete={onRemove}
            variant="filled"
            sx={[
                {
                    maxWidth: '100%',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    backgroundColor: bgColor,
                    color: '#fff',
                    '& .MuiChip-deleteIcon': {
                        color: 'rgba(255, 255, 255, 0.7)',
                        '&:hover': {color: '#fff'},
                    },
                },
                ...(Array.isArray(sx) ? sx : [sx]),
            ]}
            {...props}
        />
    )
}
