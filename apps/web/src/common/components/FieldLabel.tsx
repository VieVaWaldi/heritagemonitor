import type {ReactNode} from 'react'
import type {SxProps, Theme} from '@mui/material/styles'
import {Text} from '@/common/text'

export interface FieldLabelProps {
    children: ReactNode
    sx?: SxProps<Theme>
}

/**
 * The one style for "a small grey label naming a control": the "Corpus" label
 * in the corpus selector and every facet card title. Same variant, colour and
 * case in all of them — change it here, not at the call sites.
 */
export function FieldLabel({children, sx}: FieldLabelProps) {
    return (
        <Text variant="button" sx={[{color: 'text.disabled'}, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}>
            {children}
        </Text>
    )
}
