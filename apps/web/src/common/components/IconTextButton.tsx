'use client'

import Button, {type ButtonProps} from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import type {ReactNode} from 'react'
import type {Placement} from '@floating-ui/utils'

export interface IconTextButtonProps extends Omit<ButtonProps, 'startIcon'> {
    icon: ReactNode
    label?: string
    tooltip?: string
    selected?: boolean
    placement?: Placement
}

export function IconTextButton({
    icon,
    label,
    tooltip,
    selected = false,
    sx,
    placement = 'bottom',
    ...props
}: IconTextButtonProps) {
    const isIconOnly = !label
    const tooltipText = tooltip ?? label

    const button = (
        <Button
            // Always "text" — MUI's "outlined" variant reserves border space
            // that "text" doesn't, so toggling between them on `selected`
            // shifted the content by the border width. A permanent 1px
            // border (transparent when unselected) reserves that space
            // unconditionally instead.
            variant="text"
            startIcon={isIconOnly ? undefined : icon}
            sx={[
                {
                    borderRadius: isIconOnly ? '50%' : '8px',
                    px: isIconOnly ? 0 : 2,
                    py: isIconOnly ? 0 : 1,
                    minWidth: isIconOnly ? 40 : undefined,
                    width: isIconOnly ? 40 : undefined,
                    height: isIconOnly ? 40 : undefined,
                    textTransform: 'none',
                    fontWeight: 500,
                    color: selected ? 'primary.main' : 'text.secondary',
                    border: '1px solid',
                    borderColor: selected ? 'primary.main' : 'transparent',
                    backgroundColor: 'transparent',
                    '&:hover': {
                        backgroundColor: selected ? 'primary.main' : 'action.hover',
                        borderColor: selected ? 'primary.main' : 'transparent',
                        color: selected ? 'primary.contrastText' : 'text.primary',
                    },
                },
                ...(Array.isArray(sx) ? sx : [sx]),
            ]}
            {...props}
        >
            {isIconOnly ? icon : label}
        </Button>
    )

    if (tooltipText) {
        return (
            <Tooltip title={tooltipText} arrow placement={placement}>
                {button}
            </Tooltip>
        )
    }

    return button
}
