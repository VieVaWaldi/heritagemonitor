'use client'

import {useState} from 'react'
import {useTranslations} from 'next-intl'
import Image from 'next/image'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import {alpha} from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import {IconTextButton} from '@/common/components'
import {Text} from '@/common/text'

interface AboutEntry {
    title: string
    description: string
}

interface AboutStep {
    label: string
    count: string
    description: string
}

function StepRow({step, index, isLast}: {step: AboutStep; index: number; isLast: boolean}) {
    return (
        <Box sx={{display: 'flex', gap: 2, position: 'relative', pb: isLast ? 0 : 2.75}}>
            {!isLast && (
                <Box sx={{position: 'absolute', left: 15, top: 32, bottom: -6, width: '2px', backgroundColor: 'divider'}} />
            )}
            <Box
                sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    zIndex: 1,
                }}
            >
                {index + 1}
            </Box>
            <Box sx={{flex: 1, pt: 0.25}}>
                <Box sx={{display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap', mb: 0.5}}>
                    <Text variant="body2" sx={{fontWeight: 600}}>
                        {step.label}
                    </Text>
                    <Text variant="caption" sx={{color: 'secondary.main', fontWeight: 600}}>
                        {step.count}
                    </Text>
                </Box>
                <Text variant="body2" color="text.secondary" sx={{lineHeight: 1.55}}>
                    {step.description}
                </Text>
            </Box>
        </Box>
    )
}

// Trigger + its Dialog live in one component — the only place either is
// used, so no value yet in splitting an open/onClose-controlled Modal out
// (apps/web/RULES.md #5: don't build structure a module doesn't need yet;
// see RankingButton for the same "stays local until a 2nd UseCase needs it"
// reasoning). Wired into the minorities SearchNav slot via
// ../aboutTriggerRegistry.ts, the same registry pattern
// resultsPanelRegistry.ts uses to keep this UseCase-specific rather than a
// branch inside the shared SearchNav.
export function AboutListButton() {
    const t = useTranslations('MinoritiesAbout')
    const knowBefore = t.raw('knowBefore') as AboutEntry[]
    const steps = t.raw('steps') as AboutStep[]
    const [open, setOpen] = useState(false)

    return (
        <>
            <IconTextButton
                icon={<InfoOutlinedIcon fontSize="small" />}
                label={t('trigger')}
                onClick={() => setOpen(true)}
                sx={{whiteSpace: 'nowrap', flexShrink: 0}}
            />

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <IconButton
                    onClick={() => setOpen(false)}
                    aria-label={t('close')}
                    size="small"
                    sx={{position: 'absolute', top: 14, right: 14, color: 'text.disabled'}}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>

                <Box sx={{p: {xs: 3, sm: 4.5}, pt: {xs: 4, sm: 5}, maxHeight: '85vh', overflowY: 'auto'}}>
                    <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3}}>
                        <Text variant="h4" sx={{fontSize: '1.9rem', flexShrink: 1}}>
                            {t('title')}
                        </Text>
                        <Image
                            src="/images/logos/digicher-logo.png"
                            alt="DIGICHer"
                            width={817}
                            height={363}
                            style={{height: 44, width: 'auto', flexShrink: 0}}
                        />
                    </Box>

                    <Text variant="body2" color="text.secondary" sx={{lineHeight: 1.65, mb: 3}}>
                        {t('intro')}
                    </Text>

                    <Box
                        sx={{
                            backgroundColor: 'background.default',
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 2,
                            p: 2.25,
                            mb: 3.5,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1.5,
                        }}
                    >
                        {knowBefore.map((entry) => (
                            <Box key={entry.title} sx={{display: 'flex', gap: 1.25}}>
                                <Box
                                    sx={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: '50%',
                                        backgroundColor: 'secondary.main',
                                        flexShrink: 0,
                                        mt: 0.75,
                                    }}
                                />
                                <Text variant="body2" color="text.secondary" sx={{lineHeight: 1.55}}>
                                    <Box component="span" sx={{color: 'text.primary', fontWeight: 600}}>
                                        {entry.title}
                                    </Box>{' '}
                                    {entry.description}
                                </Text>
                            </Box>
                        ))}
                    </Box>

                    <Text variant="h6" sx={{mb: 2.5}}>
                        {t('stepsTitle')}
                    </Text>

                    <Box sx={{mb: 3}}>
                        {steps.map((step, index) => (
                            <StepRow key={step.label} step={step} index={index} isLast={index === steps.length - 1} />
                        ))}
                    </Box>

                    <Text
                        variant="body2"
                        sx={{
                            lineHeight: 1.6,
                            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
                            color: 'text.primary',
                            borderRadius: 2,
                            p: 2,
                            mb: 3,
                            '& strong': {fontWeight: 700, color: 'primary.dark'},
                        }}
                    >
                        {t.rich('result', {strong: (chunks) => <strong>{chunks}</strong>})}
                    </Text>

                    <Text variant="body2" color="text.secondary">
                        {t.rich('feedback', {
                            // onClick intentionally left undefined — destination not defined yet,
                            // same as HeroPage's footerCta haveIdea link.
                            tellUs: (chunks) => (
                                <Link component="button" type="button" sx={{verticalAlign: 'baseline'}}>
                                    {chunks}
                                </Link>
                            ),
                        })}
                    </Text>
                </Box>
            </Dialog>
        </>
    )
}
