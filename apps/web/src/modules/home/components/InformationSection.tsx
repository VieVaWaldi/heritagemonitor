import Box from '@mui/material/Box'
import Image from 'next/image'
import TranslateIcon from '@mui/icons-material/Translate'
import FilterAltIcon from '@mui/icons-material/FilterAlt'
import TopicIcon from '@mui/icons-material/Topic'
import {useTranslations} from 'next-intl'
import {Text} from '@/common/text'
import type {IconComponent} from '@/common/components'

interface FeatureEntry {
    title: string
    description: string
}

interface FeatureCardStyle {
    icon: IconComponent
    color: string
}

const FEATURE_CARD_STYLES: FeatureCardStyle[] = [
    {icon: TranslateIcon, color: 'primary.light'},
    {icon: FilterAltIcon, color: 'primary.dark'},
    {icon: TopicIcon, color: 'warning.light'},
]

interface PrototypeEntry {
    caption: string
}

interface PrototypeAsset {
    src: string
    alt: string
    width: number
    height: number
}

const PROTOTYPE_ASSETS: PrototypeAsset[] = [
    {
        src: '/images/informationSection/FSUJena_Collaboration_Network.webp',
        alt: "Geospatial deck.gl visualisation arcing from FSU Jena's collaborators across the globe",
        width: 1200,
        height: 1082,
    },
    {
        src: '/images/informationSection/Archeology_Collaboration_Network.webp',
        alt: 'd3-force bubble visualisation clustering an archaeology query network by topic',
        width: 1200,
        height: 1082,
    },
]

export function InformationSection() {
    const t = useTranslations('Home.information')
    const tldr = t.raw('tldr') as string[]
    const features = t.raw('features') as FeatureEntry[]
    const prototypes = t.raw('prototypes') as PrototypeEntry[]

    return (
        <Box component="section" sx={{backgroundColor: 'background.default', pt: 12, pb: 12, px: {xs: 3, md: 4}}}>
            <Box sx={{maxWidth: 800, mx: 'auto', mb: 12}}>
                <Text variant="h5" component="h2" sx={{fontWeight: 600, textAlign: 'center', mb: 6}}>
                    {t('title')}
                </Text>

                <Box sx={{display: 'flex', flexDirection: 'column', gap: 3}}>
                    {tldr.map((line) => (
                        <Text key={line} variant="body1" color="text.secondary" sx={{lineHeight: 1.7}}>
                            {line}
                        </Text>
                    ))}
                </Box>
            </Box>

            <Box sx={{maxWidth: 1200, mx: 'auto', mb: 12}}>
                <Text variant="h5" component="h3" sx={{fontWeight: 600, textAlign: 'center', mb: 6}}>
                    {t('featuresTitle')}
                </Text>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {xs: '1fr', md: 'repeat(3, 1fr)'},
                        gap: 4,
                    }}
                >
                    {features.map((feature, index) => {
                        const {icon: Icon, color} = FEATURE_CARD_STYLES[index]
                        return (
                            <Box
                                key={feature.title}
                                sx={{
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 2,
                                    p: 4,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2,
                                }}
                            >
                                <Icon fontSize="large" sx={{color}} />
                                <Text variant="subtitle1" sx={{fontWeight: 600}}>
                                    {feature.title}
                                </Text>
                                <Text variant="body2" color="text.secondary" sx={{lineHeight: 1.7}}>
                                    {feature.description}
                                </Text>
                            </Box>
                        )
                    })}
                </Box>
            </Box>

            <Box sx={{maxWidth: 1200, mx: 'auto'}}>
                <Text variant="h5" component="h3" sx={{fontWeight: 600, textAlign: 'center', mb: 3}}>
                    {t('prototypesTitle')}
                </Text>
                <Text
                    variant="body1"
                    color="text.secondary"
                    sx={{lineHeight: 1.7, textAlign: 'center', maxWidth: 720, mx: 'auto', mb: 6}}
                >
                    {t('prototypesIntro')}
                </Text>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {xs: '1fr', md: 'repeat(2, 1fr)'},
                        gap: 4,
                    }}
                >
                    {prototypes.map((prototype, index) => {
                        const asset = PROTOTYPE_ASSETS[index]
                        return (
                            <Box
                                key={asset.src}
                                component="figure"
                                sx={{
                                    m: 0,
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    backgroundColor: 'background.paper',
                                }}
                            >
                                <Image
                                    src={asset.src}
                                    alt={asset.alt}
                                    width={asset.width}
                                    height={asset.height}
                                    sizes="(max-width: 900px) 100vw, 560px"
                                    style={{width: '100%', height: 'auto', display: 'block'}}
                                />
                                <Text
                                    component="figcaption"
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{p: 2.5, lineHeight: 1.6}}
                                >
                                    {prototype.caption}
                                </Text>
                            </Box>
                        )
                    })}
                </Box>
            </Box>
        </Box>
    )
}
