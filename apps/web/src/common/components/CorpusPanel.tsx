'use client'

import {useState} from 'react'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Divider from '@mui/material/Divider'
import {alpha} from '@mui/material/styles'
import {Text} from '@/common/text'
import {fluidUnit} from '@/common/theme/fluidUnit'
import {CORPUSES, useCorpus, type CorpusKey, type CorpusOption} from '@/common/catalog'

const ROW_HEIGHT = 44
const CORNER_RADIUS = 12
// Snug around "Corpus" + the longest shorthand label ("DCH") + icon + status
// dot, not derived per-selection — a fixed collapsed width means switching
// corpus doesn't also resize the box.
const COLLAPSED_WIDTH = 180
const PANEL_WIDTH = 260
// Visual gap between the trigger and the floating panel below it. Applied
// as padding-top on the (invisible) hover bridge rather than a margin on
// the visible card, so the gap itself stays part of the hoverable area and
// crossing it doesn't trigger mouseLeave before the pointer reaches the card
// — same trick EntitySelector uses for its own floating panel.
const PANEL_GAP = 1.25
const FADE_TRANSITION = 'opacity 150ms ease'

// A small "power light" marking which corpus is currently active on the
// collapsed trigger. The expanded panel doesn't repeat it — the rows are
// plain options there, not a status readout.
function StatusDot() {
    return (
        <Box
            component="span"
            sx={(theme) => ({
                width: 8,
                height: 8,
                borderRadius: '50%',
                flexShrink: 0,
                backgroundColor: 'success.main',
                boxShadow: `0 0 4px 1px ${alpha(theme.palette.success.main, 0.8)}`,
            })}
        />
    )
}

interface CorpusRowProps {
    option: CorpusOption
    onSelect: () => void
}

function CorpusRow({option, onSelect}: CorpusRowProps) {
    return (
        <ButtonBase
            onClick={onSelect}
            sx={(theme) => ({
                width: '100%',
                height: ROW_HEIGHT,
                justifyContent: 'flex-start',
                gap: 1,
                px: fluidUnit(1.25),
                backgroundColor: 'transparent',
                // A clearly visible highlight, not MUI's default faint
                // action.hover tint — this is the "hovered row" cue.
                '&:hover': {backgroundColor: alpha(theme.palette.primary.main, 0.08)},
            })}
        >
            <option.icon fontSize="small" sx={{color: option.color}} />
            <Text variant="body2">{option.fullName}</Text>
        </ButtonBase>
    )
}

// Hugs the right edge of the shared Navbar (see ./Navbar). The trigger
// itself carries no border or shadow — it's plain text/icons sitting
// directly on the Navbar, same as HMMenu on the other end. Hovering or
// clicking it opens a floating panel below, the same mechanism
// EntitySelector uses for its own dropdown (absolute, positioned via
// top: 100% + a padding-top gap so the gap stays part of the hoverable
// area): that panel is what carries the border/shadow/elevation needed to
// read as a card floating over arbitrary page content, right-aligned here
// instead of centered since the trigger sits flush against the edge.
export function CorpusPanel() {
    const {selectedCorpus, setSelectedCorpus} = useCorpus()
    const [expanded, setExpanded] = useState(false)

    const selected = CORPUSES.find((option) => option.key === selectedCorpus) ?? CORPUSES[0]

    function handleSelect(key: CorpusKey) {
        setSelectedCorpus(key)
        setExpanded(false)
    }

    return (
        <Box
            onMouseEnter={() => setExpanded(true)}
            onMouseLeave={() => setExpanded(false)}
            sx={{position: 'relative', width: COLLAPSED_WIDTH, height: ROW_HEIGHT, flexShrink: 0}}
        >
            <ButtonBase
                onClick={() => setExpanded(true)}
                aria-label="corpus"
                aria-haspopup="listbox"
                aria-expanded={expanded}
                sx={{
                    width: '100%',
                    height: '100%',
                    justifyContent: 'center',
                    gap: 1,
                    px: fluidUnit(1.25),
                }}
            >
                <Text variant="button" sx={{color: 'text.disabled'}}>
                    Corpus
                </Text>
                <Text variant="button" sx={{color: selected.color}}>
                    {selected.label}
                </Text>
                <selected.icon fontSize="small" sx={{color: selected.color}} />
                <StatusDot />
            </ButtonBase>

            <Box
                role="listbox"
                sx={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    pt: PANEL_GAP,
                    width: PANEL_WIDTH,
                    opacity: expanded ? 1 : 0,
                    visibility: expanded ? 'visible' : 'hidden',
                    pointerEvents: expanded ? 'auto' : 'none',
                    transition: FADE_TRANSITION,
                    zIndex: (t) => t.zIndex.appBar,
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
                    {CORPUSES.map((option, index) => (
                        <Box key={option.key}>
                            {index > 0 && <Divider variant="middle" />}
                            <CorpusRow option={option} onSelect={() => handleSelect(option.key)} />
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    )
}
