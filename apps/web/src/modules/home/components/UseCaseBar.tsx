'use client'

import {useEffect, useRef, useState} from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import {IconTextButton} from '@/common/components'
import type {UseCase} from '../data/useCases'

export interface UseCaseBarProps {
    useCases: UseCase[]
    selectedKey: string
    onSelect: (key: string) => void
}

// Matches the height IconTextButton renders at with the sx below (py: 1.25 +
// medium icon + 1.05rem text) so the arrows read as "one of the row", not a
// mismatched control bolted on.
const ARROW_SIZE = 48

export function UseCaseBar({useCases, selectedKey, onSelect}: UseCaseBarProps) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)

    const updateOverflow = () => {
        const el = scrollRef.current
        if (!el) return
        setCanScrollLeft(el.scrollLeft > 4)
        setCanScrollRight(el.scrollWidth - el.clientWidth - el.scrollLeft > 4)
    }

    useEffect(() => {
        updateOverflow()
        const el = scrollRef.current
        if (!el) return
        const observer = new ResizeObserver(updateOverflow)
        observer.observe(el)
        return () => observer.disconnect()
    }, [useCases])

    const scrollByAmount = (direction: 1 | -1) => {
        const el = scrollRef.current
        if (!el) return
        el.scrollBy({left: direction * el.clientWidth * 0.8, behavior: 'smooth'})
    }

    return (
        <Box sx={{position: 'relative', display: 'flex', alignItems: 'center'}}>
            {canScrollLeft && (
                <IconButton
                    onClick={() => scrollByAmount(-1)}
                    aria-label="Scroll back"
                    sx={{
                        position: 'absolute',
                        left: 0,
                        zIndex: 1,
                        width: ARROW_SIZE,
                        height: ARROW_SIZE,
                        borderRadius: '50%',
                        border: 1,
                        borderColor: 'divider',
                        backgroundColor: 'background.paper',
                        color: 'primary.main',
                        boxShadow: 2,
                        '&:hover': {backgroundColor: 'background.paper', borderColor: 'primary.main'},
                    }}
                >
                    <KeyboardArrowLeftIcon fontSize="medium" />
                </IconButton>
            )}
            <Box
                ref={scrollRef}
                onScroll={updateOverflow}
                sx={{
                    display: 'flex',
                    flexWrap: 'nowrap',
                    justifyContent: 'flex-start',
                    overflowX: 'auto',
                    width: '100%',
                    gap: 3,
                    pl: 1,
                    pr: canScrollRight ? `${ARROW_SIZE + 16}px` : 1,
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': {display: 'none'},
                }}
            >
                {useCases.map((useCase) => (
                    <IconTextButton
                        key={useCase.key}
                        icon={<useCase.icon fontSize="medium" sx={{color: useCase.color}} />}
                        label={useCase.name}
                        selected={useCase.key === selectedKey}
                        onClick={() => onSelect(useCase.key)}
                        sx={{px: 2.5, py: 1.25, fontSize: '1.05rem', flexShrink: 0, whiteSpace: 'nowrap'}}
                    />
                ))}
            </Box>
            {canScrollRight && (
                <IconButton
                    onClick={() => scrollByAmount(1)}
                    aria-label="Scroll for more"
                    sx={{
                        position: 'absolute',
                        right: 0,
                        zIndex: 1,
                        width: ARROW_SIZE,
                        height: ARROW_SIZE,
                        borderRadius: '50%',
                        border: 1,
                        borderColor: 'divider',
                        backgroundColor: 'background.paper',
                        color: 'primary.main',
                        boxShadow: 2,
                        '&:hover': {backgroundColor: 'background.paper', borderColor: 'primary.main'},
                    }}
                >
                    <KeyboardArrowRightIcon fontSize="medium" />
                </IconButton>
            )}
        </Box>
    )
}
