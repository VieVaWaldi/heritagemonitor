'use client'

import Image from 'next/image'
import ButtonBase from '@mui/material/ButtonBase'
import {useTheme} from '@mui/material/styles'

// Hard WIP, need to make this pretty and then delete all the useless comments

// Intrinsic aspect ratio of /icons/HMIcon.png (trimmed to its ink bbox,
// 1464x727), used so the 'plain' variant can size by height alone without
// stretching the glyph.
const ICON_ASPECT_RATIO = 1464 / 727

// 'circle' zooms the glyph past what object-fit: contain gives it — contain
// is capped by the wordmark's ~2:1 width, which leaves a lot of empty space
// above/below in a square/circular frame. Scaling up and letting the
// circle's overflow:hidden crop the sides trades a sliver of the outer
// serifs for a wordmark that actually reads as the button's content.
const CIRCLE_ZOOM = 1.35

export type HMMenuVariant = 'plain' | 'circle' | 'square' | 'pill'

export interface HMMenuProps {
    onClick?: () => void
    variant?: HMMenuVariant
    // Button height in px. 'plain' derives width from the icon's aspect
    // ratio; the other variants are square (or pill, which is wider).
    size?: number
}

// Main nav menu trigger, built from the HM wordmark so it doubles as the
// app's logo. The glyph is black-on-transparent, so we invert it in dark
// mode rather than shipping a second asset.
export function HMMenu({onClick, variant = 'circle', size = 64}: HMMenuProps) {
    const theme = useTheme()
    const invert = theme.palette.mode === 'dark'

    const isFramed = variant !== 'plain'
    const width = variant === 'plain' ? Math.round(size * ICON_ASPECT_RATIO) : variant === 'pill' ? size * 2 : size
    // Framed variants pad the glyph away from the border; 'plain' stays
    // edge-to-edge since there's no chrome to breathe against. 'circle'
    // gets a much tighter pad than 'square'/'pill' — the glyph is ~2:1
    // wide, so at a shared padding it reads small inside a circle's
    // inscribed square; tightening it lets the wordmark nearly reach the
    // circle's left/right edge instead of floating in the middle.
    const paddingFactor = variant === 'circle' ? 0.06 : 0.22
    const padding = isFramed ? size * paddingFactor : 0
    // String px values, not bare numbers — sx multiplies a numeric
    // borderRadius by theme.shape.borderRadius (8), which silently turned
    // the intended 10px 'square' corner into 80px.
    const borderRadius = variant === 'circle' ? '50%' : variant === 'pill' ? `${size}px` : '10px'

    return (
        <ButtonBase
            onClick={onClick}
            aria-label="Menu"
            sx={{
                position: 'relative',
                width,
                height: size,
                borderRadius,
                border: isFramed ? 1 : 0,
                borderColor: 'divider',
                backgroundColor: isFramed ? 'background.paper' : 'transparent',
                overflow: 'hidden',
                transition: (t) =>
                    t.transitions.create(['background-color', 'border-color', 'transform'], {
                        duration: t.transitions.duration.shortest,
                    }),
                '&:hover': {
                    backgroundColor: isFramed ? 'action.hover' : 'transparent',
                    borderColor: isFramed ? 'text.secondary' : undefined,
                    opacity: isFramed ? 1 : 0.7,
                },
            }}
        >
            <Image
                src="/icons/HMIcon.png"
                alt="HeritageMonitor"
                fill
                sizes={`${width}px`}
                style={{
                    objectFit: 'contain',
                    padding,
                    transform: variant === 'circle' ? `scale(${CIRCLE_ZOOM})` : undefined,
                    filter: invert ? 'invert(1)' : undefined,
                }}
                priority
            />
        </ButtonBase>
    )
}
