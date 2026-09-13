'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import {Text, type TextVariant} from '@/common/text'

const VARIANTS: TextVariant[] = [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'subtitle1',
    'subtitle2',
    'body1',
    'body2',
    'caption',
    'overline',
    'button',
]

const SAMPLE = 'The quick brown fox jumps over the lazy dog'
const LONG_SAMPLE =
    'HeritageMonitor tracks and visualizes how cultural heritage research evolves across Europe — who is funding it, who is publishing it, and how the field is changing over time.'

function VariantRow({variant}: {variant: TextVariant}) {
    return (
        <Box sx={{display: 'flex', alignItems: 'baseline', gap: 3}}>
            <Text
                variant="caption"
                color="text.secondary"
                sx={{width: 100, flexShrink: 0, fontFamily: 'monospace'}}
            >
                {variant}
            </Text>
            <Text variant={variant}>{SAMPLE}</Text>
        </Box>
    )
}

export function TypographyDemoPage() {
    return (
        <Box sx={{p: 4, maxWidth: 800}}>
            <Text variant="h4" component="h1" sx={{mb: 1}}>
                Typography
            </Text>
            <Text variant="body2" color="text.secondary" sx={{mb: 4}}>
                Every `Text` variant, plus the truncate and srOnly props. Use the toggle above to
                check both themes.
            </Text>

            <Stack spacing={2} sx={{mb: 4}}>
                {VARIANTS.map((variant) => (
                    <VariantRow key={variant} variant={variant} />
                ))}
            </Stack>

            <Divider sx={{mb: 4}} />

            <Text variant="h6" sx={{mb: 2}}>
                truncate
            </Text>
            <Stack spacing={3} sx={{mb: 4}}>
                <Box sx={{width: 280}}>
                    <Text variant="caption" color="text.secondary" sx={{display: 'block', mb: 0.5}}>
                        truncate (single line)
                    </Text>
                    <Text variant="body1" truncate>
                        {LONG_SAMPLE}
                    </Text>
                </Box>
                <Box sx={{width: 280}}>
                    <Text variant="caption" color="text.secondary" sx={{display: 'block', mb: 0.5}}>
                        truncate=3 (line clamp)
                    </Text>
                    <Text variant="body1" truncate={3}>
                        {LONG_SAMPLE}
                    </Text>
                </Box>
            </Stack>

            <Divider sx={{mb: 4}} />

            <Text variant="h6" sx={{mb: 2}}>
                srOnly
            </Text>
            <Text variant="body2" color="text.secondary">
                The text below is visually hidden but present in the DOM for screen readers —
                inspect the page to see it:
            </Text>
            <Text variant="body1" srOnly>
                This text is only announced by screen readers.
            </Text>
        </Box>
    )
}
