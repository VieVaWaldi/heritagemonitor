import Box from '@mui/material/Box'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import {Text} from '@/common/text'

export interface ScrollHintProps {
    label: string
}

export function ScrollHint({label}: ScrollHintProps) {
    return (
        <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5}}>
            <KeyboardArrowDownIcon
                sx={{
                    color: 'primary.main',
                    '@keyframes scrollHintBounce': {
                        '0%, 100%': {transform: 'translateY(0)'},
                        '50%': {transform: 'translateY(6px)'},
                    },
                    animation: 'scrollHintBounce 1.6s ease-in-out infinite',
                }}
            />
            <Text variant="caption" color="text.secondary">
                {label}
            </Text>
        </Box>
    )
}
