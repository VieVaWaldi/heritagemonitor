'use client'

import {useTheme} from '@mui/material/styles'
import {useMemo} from 'react'
import type {VisualizationThemeColors} from './mapTypes'

/**
 * The four theme colours every layer factory takes, memoized.
 *
 * A layer's `createLayers` is called inside a `useMemo` keyed on its colours,
 * so handing it a fresh object each render would rebuild every layer on every
 * render — which for an H3 layer means re-uploading its geometry.
 */
export function useVisualizationColors(): VisualizationThemeColors {
    const theme = useTheme()
    return useMemo(
        () => ({
            primary: theme.palette.primary.main,
            primaryLight: theme.palette.primary.light,
            secondary: theme.palette.secondary.main,
            highlight: theme.palette.warning.main,
        }),
        [theme],
    )
}
