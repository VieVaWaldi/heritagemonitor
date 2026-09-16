export interface PartnerLogo {
    src: string
    /** Brightened variant for dark mode — the source logos are dark-on-transparent (or, for the EU logo, boxed in an opaque white background), so they need a recolored asset rather than a CSS filter. Omitted for logos that already work on both backgrounds. */
    darkSrc?: string
    alt: string
    href: string
    /** Intrinsic pixel dimensions, for next/image's layout-shift prevention — actual render size is set via style, not these. */
    width: number
    height: number
}

export const PARTNER_LOGOS: PartnerLogo[] = [
    {
        src: '/images/logos/digicher-logo.png',
        alt: 'DIGICHer',
        href: 'https://www.digicher-project.eu/',
        width: 817,
        height: 363,
    },
    {
        src: '/images/logos/fsujena-logo.png',
        darkSrc: '/images/logos/fsujena-logo-dark.png',
        alt: 'FSU Jena',
        href: 'https://www.gw.uni-jena.de/en/8465/juniorprofessur-fuer-digital-humanities',
        width: 2560,
        height: 1024,
    },
    {
        src: '/images/logos/eu-logo.jpg',
        darkSrc: '/images/logos/eu-logo-dark.png',
        alt: 'EU Funded',
        href: 'https://cordis.europa.eu/project/id/101132481',
        width: 545,
        height: 360,
    },
    {
        src: '/images/logos/time-machine-logo.png',
        darkSrc: '/images/logos/time-machine-logo-dark.png',
        alt: 'Time Machine',
        href: 'https://www.timemachine.eu/',
        width: 4794,
        height: 2183,
    },
]
