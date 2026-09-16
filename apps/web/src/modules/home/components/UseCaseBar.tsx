import Box from '@mui/material/Box'
import {IconTextButton} from '@/common/components'
import {fluidUnit} from '@/common/theme/fluidUnit'
import type {UseCase} from '@/common/catalog'

export interface UseCaseBarProps {
    useCases: UseCase[]
    selectedKey: string
    onSelect: (key: string) => void
}

// Plain flex-wrap: all UseCases sit on one row whenever they actually fit
// the available width, and wrap onto further rows only once they don't —
// width-driven, not a fixed row/column count. No scroll/arrow controls —
// overflowX stays as a silent fallback (trackpad/touch) rather than a UI
// affordance, for the edge case of a single item wider than the container.
// Border/sizing live one level up on UseCaseSection (shared with
// UseCaseContentBar) — this is just the grid of buttons.
export function UseCaseBar({useCases, selectedKey, onSelect}: UseCaseBarProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: fluidUnit(1),
                overflowX: 'auto',
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
                    sx={{
                        px: fluidUnit(1.25),
                        py: fluidUnit(0.625),
                        fontSize: fluidUnit(1.05),
                        whiteSpace: 'nowrap',
                    }}
                />
            ))}
        </Box>
    )
}
