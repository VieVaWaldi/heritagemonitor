import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import type {SxProps, Theme} from '@mui/material/styles'
import Image from 'next/image'
import {PARTNER_LOGOS} from '../data/logos'

// Plain CSS transition, not theme.transitions.create(...) — this component
// has no 'use client' (it's static, no hooks), and an sx function value
// can't cross the server/client boundary: MUI's Box/Link are themselves
// client components, so passing a function prop into them from here fails
// with "Functions cannot be passed directly to Client Components".
const linkSx = {
    display: 'flex',
    alignItems: 'center',
    '& img': {
        opacity: 0.8,
        transition: 'opacity 200ms ease-in-out',
    },
    '&:hover img': {opacity: 0.3},
} satisfies SxProps<Theme>

export function LogoBanner() {
    return (
        <>
            <Box
                sx={{
                    display: {xs: 'none', sm: 'flex'},
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: 'background.paper',
                    borderTop: 1,
                    borderBottom: 1,
                    borderColor: 'divider',
                    py: 3,
                    px: 4,
                }}
            >
                {PARTNER_LOGOS.map((logo) => (
                    <Link key={logo.alt} href={logo.href} target="_blank" rel="noopener noreferrer" sx={linkSx}>
                        <Image
                            src={logo.src}
                            alt={logo.alt}
                            width={logo.width}
                            height={logo.height}
                            sizes="200px"
                            style={{height: 50, width: 'auto'}}
                        />
                    </Link>
                ))}
            </Box>

            <Box
                sx={{
                    display: {xs: 'block', sm: 'none'},
                    overflow: 'hidden',
                    backgroundColor: 'background.paper',
                    borderTop: 1,
                    borderBottom: 1,
                    borderColor: 'divider',
                    py: 3,
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        width: 'max-content',
                        '@keyframes logoBannerMarquee': {
                            '0%': {transform: 'translateX(0)'},
                            '100%': {transform: 'translateX(-50%)'},
                        },
                        animation: 'logoBannerMarquee 12s linear infinite',
                    }}
                >
                    {[...PARTNER_LOGOS, ...PARTNER_LOGOS].map((logo, i) => (
                        <Link
                            key={`${logo.alt}-${i}`}
                            href={logo.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{...linkSx, mx: 4, flexShrink: 0}}
                        >
                            <Image
                                src={logo.src}
                                alt={logo.alt}
                                width={logo.width}
                                height={logo.height}
                                sizes="160px"
                                style={{height: 40, width: 'auto'}}
                            />
                        </Link>
                    ))}
                </Box>
            </Box>
        </>
    )
}
