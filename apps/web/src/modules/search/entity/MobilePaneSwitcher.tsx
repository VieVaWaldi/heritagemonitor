'use client'

import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import TuneIcon from '@mui/icons-material/Tune'
import {useEffect, useRef, useState, type ReactNode} from 'react'
import {Text} from '@/common/text'
import {MOBILE_BOTTOM_BAR_GUTTER, MOBILE_BOTTOM_BAR_HEIGHT, MOBILE_FAB_SIZE, type IconComponent} from '@/common/components'
import {readId, SEARCH_PARAM, useUrlState} from '@/common/url'

type Pane = 'facets' | 'list' | 'detail'

export interface MobilePaneSwitcherProps {
    /** Omitted the same way EntityResultsPanel's own `facets` is — an entity
     * with nothing to filter on gets a 2-way switcher instead of 3. */
    facets?: ReactNode
    list: ReactNode
    detail: ReactNode
}

const PANE_META: Record<Pane, {label: string; icon: IconComponent}> = {
    facets: {label: 'Facets', icon: TuneIcon},
    list: {label: 'List', icon: FormatListBulletedIcon},
    detail: {label: 'Detail', icon: ArticleOutlinedIcon},
}

// Mobile's stand-in for having facets, the list and the detail panel all
// visible side by side at once (today's desktop layout, EntityResultsPanel) —
// one showing at a time, a sliding track between them, and a fixed bottom bar
// to switch. Self-contained: owns which pane is active, and auto-advances to
// Detail by itself when a NEW row is selected (watching the `sel` URL param
// directly, so this needs no wiring from whichever entity panel is open) —
// EntityResultsPanel only has to decide whether to render this or the desktop
// row layout for the given facets/list/detail content.
export function MobilePaneSwitcher({facets, list, detail}: MobilePaneSwitcherProps) {
    const panes: Pane[] = facets ? ['facets', 'list', 'detail'] : ['list', 'detail']
    const [active, setActive] = useState<Pane>('list')

    const {params} = useUrlState()
    const selectedId = readId(params, SEARCH_PARAM.selection)
    // Captures the id this component MOUNTED with as the baseline, not null —
    // so opening on a deep link that already names a row still starts on
    // List, and only a selection made AFTER that (a tap, or picking a
    // different row) advances to Detail.
    const previousSelectedId = useRef(selectedId)
    useEffect(() => {
        if (selectedId !== null && selectedId !== previousSelectedId.current) setActive('detail')
        previousSelectedId.current = selectedId
    }, [selectedId])

    const activeIndex = Math.max(panes.indexOf(active), 0)
    const content: Record<Pane, ReactNode> = {facets, list, detail}

    return (
        <Box sx={{flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column'}}>
            <Box sx={{flex: '1 1 auto', minHeight: 0, overflow: 'hidden'}}>
                <Box
                    sx={{
                        display: 'flex',
                        height: '100%',
                        width: `${panes.length * 100}%`,
                        transform: `translateX(-${activeIndex * (100 / panes.length)}%)`,
                        transition: 'transform 250ms ease',
                    }}
                >
                    {panes.map((pane) => (
                        <Box key={pane} sx={{flex: `0 0 ${100 / panes.length}%`, minWidth: 0, height: '100%', overflowY: pane === 'facets' ? 'auto' : 'visible'}}>
                            {pane === 'facets' ? (
                                <Box sx={{display: 'flex', flexDirection: 'column', gap: 2, p: 2}}>{content[pane]}</Box>
                            ) : (
                                content[pane]
                            )}
                        </Box>
                    ))}
                </Box>
            </Box>

            {/* Fixed, not sticky — EntityResultsPanel reserves this much
                height at the bottom of its mobile layout via padding so this
                never overlaps the pane content above it. Right-padded by
                HMMenu's fab diameter + its own gutter on both sides (see
                mobileLayout.ts) so that circle, which floats independently
                over the bar's right end, never sits on top of a tappable
                segment. */}
            <Box
                sx={{
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: MOBILE_BOTTOM_BAR_HEIGHT,
                    display: 'flex',
                    pr: `${MOBILE_FAB_SIZE + MOBILE_BOTTOM_BAR_GUTTER * 2}px`,
                    borderTop: 1,
                    borderColor: 'divider',
                    backgroundColor: 'background.paper',
                    // One BELOW appBar, not appBar itself — same reasoning
                    // as LlmChatRuntime's desktop panel. Navbar is `position:
                    // sticky` with its OWN zIndex: appBar, which makes it a
                    // stacking context: HMMenu's fab lives inside that
                    // context, so no z-index on the fab itself can out-rank
                    // an equal-z-index, later-in-DOM sibling of Navbar (this
                    // bar) — the whole Navbar layer loses that tie and the
                    // fab disappears underneath it. Sitting one below Navbar
                    // instead settles it at the layer level, where it belongs.
                    zIndex: (theme) => theme.zIndex.appBar - 1,
                }}
            >
                {panes.map((pane) => {
                    const {label, icon: Icon} = PANE_META[pane]
                    const selected = pane === active
                    return (
                        <ButtonBase
                            key={pane}
                            onClick={() => setActive(pane)}
                            aria-current={selected ? 'true' : undefined}
                            sx={{
                                flex: '1 1 0',
                                minWidth: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 0.25,
                                color: selected ? 'primary.main' : 'text.secondary',
                            }}
                        >
                            <Icon fontSize="small" />
                            <Text variant="caption" sx={{color: 'inherit', fontWeight: selected ? 600 : 400}}>
                                {label}
                            </Text>
                        </ButtonBase>
                    )
                })}
            </Box>
        </Box>
    )
}

/** What EntityResultsPanel pads its mobile layout's bottom by, so the fixed
 * switcher bar above never covers the last bit of whichever pane is active. */
export const MOBILE_PANE_SWITCHER_HEIGHT = MOBILE_BOTTOM_BAR_HEIGHT
