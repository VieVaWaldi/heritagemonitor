'use client'

import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import {alpha} from '@mui/material/styles'
import type {Theme} from '@mui/material/styles'
import {Text} from '@/common/text'
import {CORPUSES, useCorpus} from '@/common/catalog'

const ROW_HEIGHT = 44

/**
 * Corpus selection as a plain vertical list of rows — same selected/hover
 * grammar as MenuUseCaseList's own rows — for a menu context (HMMenu's
 * `extraSections`) where CorpusPanel's hover-triggered floating panel isn't
 * the right shape: a menu row needs to be tappable and obviously selected at
 * a glance, not something you hover to discover.
 */
export function CorpusMenuList() {
    const {selectedCorpus, setSelectedCorpus} = useCorpus()

    return (
        <Box sx={{display: 'flex', flexDirection: 'column', gap: 0.5}}>
            {CORPUSES.map((option) => {
                const selected = option.key === selectedCorpus
                return (
                    <ButtonBase
                        key={option.key}
                        onClick={() => setSelectedCorpus(option.key)}
                        aria-current={selected ? 'true' : undefined}
                        sx={(theme: Theme) => ({
                            width: '100%',
                            height: ROW_HEIGHT,
                            justifyContent: 'flex-start',
                            gap: 1.25,
                            pl: 1.5,
                            pr: 1.5,
                            borderRadius: '8px',
                            color: selected ? option.color : 'text.primary',
                            backgroundColor: selected ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                            '&:hover': {
                                backgroundColor: selected
                                    ? alpha(theme.palette.primary.main, 0.14)
                                    : alpha(theme.palette.text.primary, 0.05),
                            },
                        })}
                    >
                        <option.icon fontSize="small" sx={{color: option.color}} />
                        <Text variant="body1" sx={{flex: 1, textAlign: 'left', fontWeight: selected ? 500 : 400}}>
                            {option.fullName}
                        </Text>
                    </ButtonBase>
                )
            })}
        </Box>
    )
}
