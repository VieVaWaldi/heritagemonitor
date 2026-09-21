'use client'

import {useState} from 'react'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Divider from '@mui/material/Divider'
import {alpha} from '@mui/material/styles'
import type {Theme} from '@mui/material/styles'
import type SvgIcon from '@mui/material/SvgIcon'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import {Text} from '@/common/text'
import {useValueChangeFlash} from '@/common/hooks/useValueChangeFlash'
import {fluidUnit} from '@/common/theme/fluidUnit'
import {ACTION_BAR_BORDER_WIDTH, ACTION_BAR_BORDER_COLOR, ACTION_BAR_BORDER_HOVER_COLOR} from './actionBarStyle'

/** Type of a `@mui/icons-material` icon component, e.g. `SearchIcon`. */
export type IconComponent = typeof SvgIcon

export interface SelectorOption<Key extends string = string> {
    key: Key
    label: string
    icon: IconComponent
    /** sx-style theme color path, e.g. "secondary.main" — each option picks
     * its own so a list of icons doesn't read as one flat color. */
    color: string
}

export interface EntitySelectorProps<Key extends string = string> {
    options: SelectorOption<Key>[]
    value: Key
    onChange: (value: Key) => void
    /** False renders a plain, non-clickable icon circle with no hover panel
     * — for UseCases with nothing to pick between. Defaults true. */
    interactive?: boolean
    /**
     * `circle` (default): the icon-only circle inside the ActionBar row.
     * `label`: a text trigger — the selected option's name (its icon on narrow
     * screens) with a dropdown arrow — for a bar that puts the picker beside
     * the search instead of inside it. Same option list either way.
     */
    variant?: 'circle' | 'label'
    /** Colour of the `label` trigger's text (sx colour path). Defaults to the text colour. */
    labelColor?: string
    /** Which edge of the `label` trigger the option list lines up with: `start` (default) when the trigger sits left of the bar, `end` when it sits at the right edge, so the list never runs off screen. */
    panelAlign?: 'start' | 'end'
}

const ROW_HEIGHT = 44
const CORNER_RADIUS = 12
const PANEL_MIN_WIDTH = 200
// Visual gap between the circle and the floating panel below it. Applied as
// padding-top on the (invisible) hover bridge rather than a margin on the
// visible card, so the gap itself stays part of the hoverable area and
// crossing it doesn't trigger mouseLeave before the pointer reaches the card.
const PANEL_GAP = 1.25

// Icon-only circular button — diameter equals the ActionBar row's height via
// align-items: stretch (from the parent) + aspect-ratio: 1, so it always
// matches SearchBar's height without duplicating its padding math. Hovering
// or clicking it floats the entity list below, in the same kind of box
// CorpusPanel expands into (background.paper, elevation), but centered
// under the circle and rounded on all four corners since nothing here sits
// flush against the Navbar's edge like CorpusPanel does.
export function EntitySelector<Key extends string = string>({
    options,
    value,
    onChange,
    interactive = true,
    variant = 'circle',
    labelColor,
    panelAlign = 'start',
}: EntitySelectorProps<Key>) {
    const [open, setOpen] = useState(false)
    const selectedOption = options.find((opt) => opt.key === value)
    const isFlashing = useValueChangeFlash(value, 900)

    function handleSelect(key: Key) {
        onChange(key)
        setOpen(false)
    }

    const circleSx = (theme: Theme) => ({
        height: '100%',
        aspectRatio: '1 / 1',
        borderRadius: '50%',
        backgroundColor: 'transparent',
        border: ACTION_BAR_BORDER_WIDTH,
        borderColor: ACTION_BAR_BORDER_COLOR,
        '@keyframes entitySelectorGlow': {
            '0%': {
                boxShadow: `0 0 0 0 ${alpha(theme.palette.primary.main, 0.9)}`,
                backgroundColor: alpha(theme.palette.primary.main, 0.22),
                transform: 'scale(1)',
            },
            '35%': {
                boxShadow: `0 0 0 12px ${alpha(theme.palette.primary.main, 0.45)}`,
                backgroundColor: alpha(theme.palette.primary.main, 0.12),
                transform: 'scale(1.03)',
            },
            '100%': {
                boxShadow: `0 0 0 28px ${alpha(theme.palette.primary.main, 0)}`,
                backgroundColor: 'transparent',
                transform: 'scale(1)',
            },
        },
        animation: isFlashing ? 'entitySelectorGlow 900ms ease-out' : 'none',
        ...(interactive && {'&:hover': {borderColor: ACTION_BAR_BORDER_HOVER_COLOR}}),
    })

    return (
        <Box
            onMouseEnter={interactive ? () => setOpen(true) : undefined}
            onMouseLeave={interactive ? () => setOpen(false) : undefined}
            // Keyboard: Escape closes, and so does moving focus out of the picker.
            onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
            }}
            sx={{position: 'relative', alignSelf: variant === 'label' ? 'center' : 'stretch'}}
        >
            {variant === 'label' ? (
                <ButtonBase
                    onClick={() => setOpen((current) => !current)}
                    aria-label="entity type"
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    sx={{
                        alignSelf: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.25,
                        px: 0.5,
                        borderRadius: 1,
                        color: labelColor ?? 'text.primary',
                        '&:hover': {backgroundColor: 'action.hover'},
                    }}
                >
                    {/* The name where there is room; the option's own icon where there is not, so the picker stays reachable. */}
                    {selectedOption?.icon && <selectedOption.icon fontSize="small" sx={{display: {xs: 'block', md: 'none'}}} />}
                    <Text variant="button" sx={{display: {xs: 'none', md: 'block'}, fontSize: '1.15rem', color: 'inherit', whiteSpace: 'nowrap'}}>
                        {selectedOption?.label}
                    </Text>
                    <ArrowDropDownIcon fontSize="small" />
                </ButtonBase>
            ) : interactive ? (
                <ButtonBase
                    onClick={() => setOpen(true)}
                    aria-label="entity type"
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    sx={circleSx}
                >
                    {selectedOption?.icon && (
                        <selectedOption.icon fontSize="small" sx={{color: selectedOption.color}} />
                    )}
                </ButtonBase>
            ) : (
                <Box
                    aria-label="entity type"
                    sx={[circleSx, {display: 'flex', alignItems: 'center', justifyContent: 'center'}]}
                >
                    {selectedOption?.icon && (
                        <selectedOption.icon fontSize="small" sx={{color: selectedOption.color}} />
                    )}
                </Box>
            )}

            {interactive && (
                <Box
                    role="listbox"
                    sx={{
                        position: 'absolute',
                        top: '100%',
                        ...(variant === 'label' ? (panelAlign === 'end' ? {right: 0} : {left: 0}) : {left: '50%'}),
                        transform: variant === 'label' ? 'none' : 'translateX(-50%)',
                        pt: PANEL_GAP,
                        minWidth: PANEL_MIN_WIDTH,
                        opacity: open ? 1 : 0,
                        visibility: open ? 'visible' : 'hidden',
                        pointerEvents: open ? 'auto' : 'none',
                        transition: 'opacity 150ms ease',
                        zIndex: (theme) => theme.zIndex.appBar,
                    }}
                >
                    <Box
                        sx={{
                            borderRadius: `${CORNER_RADIUS}px`,
                            backgroundColor: 'background.paper',
                            border: 1,
                            borderColor: 'divider',
                            boxShadow: 2,
                            overflow: 'hidden',
                        }}
                    >
                        {options.map((option, index) => (
                            <Box key={option.key}>
                                {index > 0 && <Divider />}
                                <ButtonBase
                                    role="option"
                                    aria-selected={option.key === value}
                                    onClick={() => handleSelect(option.key)}
                                    sx={(theme) => ({
                                        width: '100%',
                                        height: ROW_HEIGHT,
                                        justifyContent: 'flex-start',
                                        gap: 1,
                                        px: fluidUnit(1.25),
                                        // No persistent "selected" fill — only hover gets a background.
                                        backgroundColor: 'transparent',
                                        '&:hover': {backgroundColor: alpha(theme.palette.primary.main, 0.08)},
                                    })}
                                >
                                    <option.icon fontSize="small" sx={{color: option.color}} />
                                    <Text variant="body2">{option.label}</Text>
                                </ButtonBase>
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}
        </Box>
    )
}
