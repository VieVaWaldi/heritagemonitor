'use client'

import Box from '@mui/material/Box'
import {IconTextButton} from '@/common/components'
import {Text} from '@/common/text'
import {ENTITIES, type UseCase} from '../data/useCases'

export interface UseCaseContentBarProps {
    useCase: UseCase
    selectedSubUseCaseKey?: string
    onSelectSubUseCase: (key: string) => void
}

export function UseCaseContentBar({
    useCase,
    selectedSubUseCaseKey,
    onSelectSubUseCase,
}: UseCaseContentBarProps) {
    return (
        <Box sx={{flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', justifyContent: 'flex-start'}}>
            <Box
                sx={{
                    width: '90%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 2.5,
                    py: 2,
                }}
            >
                <Text
                    variant="subtitle1"
                    color="text.secondary"
                    sx={{
                        textAlign: 'left',
                        fontStyle: 'italic',
                        borderLeft: 3,
                        borderColor: useCase.color,
                        pl: 2,
                    }}
                >
                    {useCase.description}
                </Text>

                {useCase.subUseCases && useCase.subUseCases.length > 0 && (
                    <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1}}>
                        {useCase.subUseCases.map((subUseCase) => {
                            const entity = ENTITIES.find((e) => e.key === subUseCase.action.entity)
                            return (
                                <IconTextButton
                                    key={subUseCase.key}
                                    icon={
                                        entity ? (
                                            <entity.icon fontSize="medium" sx={{color: entity.color}} />
                                        ) : undefined
                                    }
                                    label={subUseCase.name}
                                    selected={subUseCase.key === selectedSubUseCaseKey}
                                    onClick={() => onSelectSubUseCase(subUseCase.key)}
                                    sx={{px: 2.5, py: 1.25, fontSize: '1.05rem'}}
                                />
                            )
                        })}
                    </Box>
                )}
            </Box>
        </Box>
    )
}
