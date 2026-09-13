'use client'

import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import type {ReactNode} from 'react'
import {Text} from '@/common/text'

export interface FilterSectionProps {
    title?: string
    children: ReactNode
    showDivider?: boolean
}

export function FilterSection({title, children, showDivider = true}: FilterSectionProps) {
    return (
        <Box>
            {showDivider && <Divider sx={{mb: 2}} />}
            {title && (
                <Text variant="subtitle1" sx={{fontWeight: 600, mb: 2}}>
                    {title}
                </Text>
            )}
            <Box sx={{display: 'flex', flexDirection: 'column', gap: 2}}>{children}</Box>
        </Box>
    )
}
