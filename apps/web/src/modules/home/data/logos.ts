export interface PartnerLogo {
    src: string
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
        alt: 'FSU Jena',
        href: 'https://www.gw.uni-jena.de/en/8465/juniorprofessur-fuer-digital-humanities',
        width: 2560,
        height: 1024,
    },
    {
        src: '/images/logos/eu-logo.jpg',
        alt: 'EU Funded',
        href: 'https://cordis.europa.eu/project/id/101132481',
        width: 545,
        height: 360,
    },
    {
        src: '/images/logos/time-machine-logo.png',
        alt: 'Time Machine',
        href: 'https://www.timemachine.eu/',
        width: 4794,
        height: 2183,
    },
]
