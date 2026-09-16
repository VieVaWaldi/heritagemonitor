'use client'

import Box from '@mui/material/Box'
import {useElementWidth} from '@/common/hooks/useElementWidth'
import {fluidUnit} from '@/common/theme/fluidUnit'
import type {UseCase} from '@/common/catalog'
import {UseCaseBar} from './UseCaseBar'
import {UseCaseContentBar} from './UseCaseContentBar'

export interface UseCaseSectionProps {
    useCases: UseCase[]
    selectedUseCase: UseCase
    selectedSubUseCaseKey?: string
    onSelectUseCase: (key: string) => void
    onSelectSubUseCase: (key: string) => void
}

// One connected border around UseCaseBar (the grid of UseCases) and
// UseCaseContentBar (sub-use-case picker + description) below it, instead
// of each having its own box. width: 'fit-content' (capped by maxWidth so
// wrapping/overflow still kick in on narrow screens) means this box's width
// is set by UseCaseBar's widest row — UseCaseContentBar defers to that
// (see its own width: '100%').
//
// That deferring can't be plain CSS: UseCaseContentBar's width:'100%' is a
// percentage of this still-being-computed fit-content box, a cyclic
// reference browsers resolve by treating it as 'auto' when they size this
// box — which lets its own content (the description text, unwrapped) push
// this box wider than UseCaseBar needs. So we measure UseCaseBar directly
// and pass its width down as an explicit px cap.
export function UseCaseSection({
    useCases,
    selectedUseCase,
    selectedSubUseCaseKey,
    onSelectUseCase,
    onSelectSubUseCase,
}: UseCaseSectionProps) {
    const [barRef, barWidth] = useElementWidth<HTMLDivElement>()

    return (
        <Box
            sx={{
                width: 'fit-content',
                maxWidth: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: fluidUnit(1),
                p: fluidUnit(1),
                border: 1,
                borderColor: 'divider',
                borderRadius: '12px',
            }}
        >
            <Box ref={barRef}>
                <UseCaseBar
                    useCases={useCases}
                    selectedKey={selectedUseCase.key}
                    onSelect={onSelectUseCase}
                />
            </Box>
            <UseCaseContentBar
                useCase={selectedUseCase}
                selectedSubUseCaseKey={selectedSubUseCaseKey}
                onSelectSubUseCase={onSelectSubUseCase}
                maxWidth={barWidth}
            />
        </Box>
    )
}
