import Typography, {type TypographyProps} from '@mui/material/Typography'
import type {ReactNode} from 'react'

export type TextVariant =
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6'
    | 'subtitle1'
    | 'subtitle2'
    | 'body1'
    | 'body2'
    | 'caption'
    | 'overline'
    | 'button'

export interface TextProps extends Omit<TypographyProps, 'variant' | 'noWrap' | 'children'> {
    /** Visual style. Defaults to body1. Semantic tag follows the theme's
     * variantMapping unless overridden with `component`. */
    variant?: TextVariant
    /** true = single-line ellipsis. A number = clamp to that many lines. */
    truncate?: boolean | number
    /** Visually hidden, still reachable by screen readers. */
    srOnly?: boolean
    children: ReactNode
}

// Wraps MUI's Typography so no other file in the app imports it directly —
// this is the one place variant/semantic-tag decoupling, truncation, and
// screen-reader-only text are implemented, per apps/web/RULES.md #4 (wrap
// external components). Deliberately has no hooks and isn't a client
// component: it only renders `children`, so it never forces a client
// boundary. Translation lookup happens at the call site (next-intl's
// useTranslations/getTranslations) — this component only renders the
// resolved string/rich content, it doesn't know about locales.
export function Text({variant = 'body1', truncate, srOnly, sx, children, ...props}: TextProps) {
    return (
        <Typography
            variant={variant}
            sx={[
                truncate === true && {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                },
                typeof truncate === 'number' && {
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: truncate,
                    overflow: 'hidden',
                },
                srOnly && {
                    position: 'absolute',
                    width: 1,
                    height: 1,
                    padding: 0,
                    margin: -1,
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    whiteSpace: 'nowrap',
                    border: 0,
                },
                ...(Array.isArray(sx) ? sx : [sx]),
            ]}
            {...props}
        >
            {children}
        </Typography>
    )
}
