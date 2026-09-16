'use client'

import Image, {type ImageProps} from 'next/image'
import {useThemeMode} from '@/common/theme/ThemeModeProvider'

interface ThemedLogoImageProps extends Omit<ImageProps, 'src'> {
    src: string
    darkSrc?: string
}

export function ThemedLogoImage({src, darkSrc, alt, ...imageProps}: ThemedLogoImageProps) {
    const {resolvedMode} = useThemeMode()
    const activeSrc = resolvedMode === 'dark' && darkSrc ? darkSrc : src
    return <Image src={activeSrc} alt={alt} {...imageProps} />
}
