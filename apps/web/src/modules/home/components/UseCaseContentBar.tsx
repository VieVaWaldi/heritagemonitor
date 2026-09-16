'use client'

import Box from '@mui/material/Box'
import {IconTextButton} from '@/common/components'
import {Text} from '@/common/text'
import {fluidUnit} from '@/common/theme/fluidUnit'
import {ENTITIES, type UseCase} from '@/common/catalog'

export interface UseCaseContentBarProps {
    useCase: UseCase
    selectedSubUseCaseKey?: string
    onSelectSubUseCase: (key: string) => void
    // Measured px width of the sibling UseCaseBar — caps this bar so its
    // content (the description in particular) can't grow the shared
    // UseCaseSection border wider than that. See UseCaseSection for why
    // this can't just be width:'100%' on its own.
    maxWidth?: number
}

// width: '100%' (not an intrinsic/shrink-to-fit size) so this defers to
// whatever width the sibling UseCaseBar established on their shared
// UseCaseSection wrapper — the description wraps to fit it instead of
// forcing the shared border wider. The "Choose" label + sub-use-case row
// only render when the current UseCase actually has sub-use-cases, so they
// take up no space at all otherwise.
export function UseCaseContentBar({
    useCase,
    selectedSubUseCaseKey,
    onSelectSubUseCase,
    maxWidth,
}: UseCaseContentBarProps) {
    const hasSubUseCases = !!useCase.subUseCases && useCase.subUseCases.length > 0

    return (
        <Box
            sx={{
                width: '100%',
                maxWidth: maxWidth ? `${maxWidth}px` : undefined,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: fluidUnit(1.25),
                py: fluidUnit(1),
            }}
        >
            {hasSubUseCases && (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: fluidUnit(0.5),
                    }}
                >
                    <Text variant="h5" sx={{fontSize: fluidUnit(1.5)}}>
                        Choose
                    </Text>
                    {/* Same plain flex-wrap grid as UseCaseBar, not a popup */}
                    <Box sx={{display: 'flex', flexWrap: 'wrap', gap: fluidUnit(1)}}>
                        {useCase.subUseCases?.map((subUseCase) => {
                            const entity = ENTITIES.find((e) => e.key === subUseCase.action.entity)
                            return (
                                <IconTextButton
                                    key={subUseCase.key}
                                    icon={
                                        entity ? (
                                            <entity.icon
                                                fontSize="medium"
                                                sx={{color: entity.color}}
                                            />
                                        ) : undefined
                                    }
                                    label={subUseCase.name}
                                    selected={subUseCase.key === selectedSubUseCaseKey}
                                    onClick={() => onSelectSubUseCase(subUseCase.key)}
                                    sx={{
                                        px: fluidUnit(1.25),
                                        py: fluidUnit(0.625),
                                        fontSize: fluidUnit(1.05),
                                        whiteSpace: 'nowrap',
                                    }}
                                />
                            )
                        })}
                    </Box>
                </Box>
            )}

            <Text
                variant="subtitle1"
                color="text.secondary"
                sx={{
                    width: '100%',
                    textAlign: 'left',
                    fontStyle: 'italic',
                    borderLeft: 3,
                    borderColor: useCase.color,
                    pl: fluidUnit(2),
                    py: fluidUnit(1),
                    pr: fluidUnit(1),
                    // subtitle1's line-height is 1.75em; reserving 3 lines' worth
                    // (descriptions vary from 1-3 lines) keeps the layout from
                    // jumping when switching use cases.
                    minHeight: '5.25em',
                }}
            >
                {useCase.description}
            </Text>
        </Box>
    )
}
