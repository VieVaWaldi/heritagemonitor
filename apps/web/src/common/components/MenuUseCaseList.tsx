'use client'

import {useState} from 'react'
import type {ReactNode} from 'react'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Collapse from '@mui/material/Collapse'
import {alpha} from '@mui/material/styles'
import type {Theme} from '@mui/material/styles'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import NextLink from 'next/link'
import {Text} from '@/common/text'
import {ENTITIES, USE_CASES, type UseCase} from '@/common/catalog'

const ROW_HEIGHT = 44
const SUB_ROW_INDENT = 4.5

export interface MenuUseCaseListProps {
    activeUseCaseKey?: string
    activeSubUseCaseKey?: string
    /** Called after a row that actually navigates is clicked — lets HMMenu close itself. */
    onNavigate: () => void
}

// The same 5 UseCases HeroPage's UseCaseBar renders (see
// modules/home/components/UseCaseBar), here as a vertical list instead of a
// wrapping row of pills — the shape a side menu needs, not something
// IconTextButton (a centered, pill-shaped, single-icon control) fits.
// Selection comes from outside (useActiveUseCase), same as HeroPage's own
// selectedUseCase/selectedSubUseCaseKey — this component only renders it.
export function MenuUseCaseList({activeUseCaseKey, activeSubUseCaseKey, onNavigate}: MenuUseCaseListProps) {
    return (
        <Box sx={{display: 'flex', flexDirection: 'column', gap: 0.5}}>
            {USE_CASES.map((useCase) => (
                <MenuUseCaseItem
                    key={useCase.key}
                    useCase={useCase}
                    active={useCase.key === activeUseCaseKey}
                    activeSubUseCaseKey={activeSubUseCaseKey}
                    onNavigate={onNavigate}
                />
            ))}
        </Box>
    )
}

interface MenuUseCaseItemProps {
    useCase: UseCase
    active: boolean
    activeSubUseCaseKey?: string
    onNavigate: () => void
}

function MenuUseCaseItem({useCase, active, activeSubUseCaseKey, onNavigate}: MenuUseCaseItemProps) {
    const hasSubUseCases = !!useCase.subUseCases?.length

    // Starts collapsed; only forced open on the transition into becoming
    // active (a permalink or back/forward landing on a sub-route), not on
    // every render — so the user can still collapse it again afterwards
    // without it snapping back open. Same "adjust during render" shape as
    // useUseCaseSearch's URL-resync (see
    // modules/search/hooks/useUseCaseSearch).
    const [expanded, setExpanded] = useState(active)
    const [prevActive, setPrevActive] = useState(active)
    if (active !== prevActive) {
        setPrevActive(active)
        if (active) setExpanded(true)
    }

    function handleClick() {
        if (hasSubUseCases) {
            setExpanded((current) => !current)
        } else {
            onNavigate()
        }
    }

    return (
        <Box>
            <MenuRow
                icon={<useCase.icon fontSize="small" sx={{color: useCase.color}} />}
                label={useCase.name}
                selected={active}
                href={hasSubUseCases ? undefined : useCase.action?.route}
                onClick={handleClick}
                trailing={
                    hasSubUseCases ? (
                        <ExpandMoreIcon
                            fontSize="small"
                            sx={{
                                color: 'text.secondary',
                                transform: expanded ? 'rotate(180deg)' : 'none',
                                transition: 'transform 150ms ease',
                            }}
                        />
                    ) : undefined
                }
                ariaExpanded={hasSubUseCases ? expanded : undefined}
            />

            {hasSubUseCases && (
                <Collapse in={expanded} unmountOnExit>
                    <Box sx={{display: 'flex', flexDirection: 'column', gap: 0.5, pt: 0.5}}>
                        {useCase.subUseCases?.map((subUseCase) => {
                            const entity = ENTITIES.find((option) => option.key === subUseCase.action.entity)
                            return (
                                <MenuRow
                                    key={subUseCase.key}
                                    icon={
                                        entity ? (
                                            <entity.icon fontSize="small" sx={{color: entity.color}} />
                                        ) : undefined
                                    }
                                    label={subUseCase.name}
                                    selected={subUseCase.key === activeSubUseCaseKey}
                                    indent
                                    href={subUseCase.action.route}
                                    onClick={onNavigate}
                                />
                            )
                        })}
                    </Box>
                </Collapse>
            )}
        </Box>
    )
}

interface MenuRowProps {
    icon?: ReactNode
    label: string
    selected: boolean
    indent?: boolean
    trailing?: ReactNode
    href?: string
    onClick: () => void
    ariaExpanded?: boolean
}

// Same selected/hover grammar as IconTextButton (primary.main text, a
// tinted fill instead of a border since a full-width row has no need to
// reserve border space) — just laid out as a left-aligned, full-width row.
function MenuRow({icon, label, selected, indent, trailing, href, onClick, ariaExpanded}: MenuRowProps) {
    const sx = (theme: Theme) => ({
        width: '100%',
        height: ROW_HEIGHT,
        justifyContent: 'flex-start',
        gap: 1.25,
        pl: indent ? SUB_ROW_INDENT : 1.5,
        pr: 1.5,
        borderRadius: '8px',
        color: selected ? 'primary.main' : 'text.primary',
        backgroundColor: selected ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
        '&:hover': {
            backgroundColor: selected
                ? alpha(theme.palette.primary.main, 0.14)
                : alpha(theme.palette.text.primary, 0.05),
        },
    })

    const content = (
        <>
            {icon}
            <Text
                variant={indent ? 'body2' : 'body1'}
                sx={{flex: 1, textAlign: 'left', fontWeight: selected ? 500 : 400}}
            >
                {label}
            </Text>
            {trailing}
        </>
    )

    if (href) {
        return (
            <ButtonBase component={NextLink} href={href} onClick={onClick} sx={sx} aria-current={selected ? 'page' : undefined}>
                {content}
            </ButtonBase>
        )
    }

    return (
        <ButtonBase onClick={onClick} sx={sx} aria-expanded={ariaExpanded} aria-current={selected ? 'page' : undefined}>
            {content}
        </ButtonBase>
    )
}
