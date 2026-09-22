import Link from '@mui/material/Link'
import Image from 'next/image'
import {DIGICHER_PROJECT_URL} from '../data/logos'

// Lives in Navbar's startAction slot (see HomePage, size="tall" — the extra
// bar height is for this) — signals to visitors (and, not incidentally, to
// the funder) that HeritageMonitor is DIGICHer's platform. The source PNG
// is orange-on-transparent, so it reads fine on both the light and dark
// navbar without a darkSrc variant.
//
// The wordmark's "g" has a long descender swash (rows ~200-289 of the
// 363-tall source, vs. the main letters' ~73-199), which drags the image's
// bounding-box center well below where the letters themselves optically
// sit. Flexbox-centering the raw image against HMMenu's "HM" then reads as
// too high, with the tail dangling in extra space below — nudging it down
// by ~12% of its rendered height re-centers the letters instead, at the
// cost of sitting the tail closer to the bar's edge (why this needs the
// tall navbar).
const OPTICAL_CENTER_OFFSET = '12%'

export function DigicherNavLogo() {
    return (
        <Link
            href={DIGICHER_PROJECT_URL}
            target="_blank"
            rel="noopener noreferrer"
            sx={{display: 'flex', alignItems: 'center'}}
        >
            <Image
                src="/images/logos/digicher-logo.png"
                alt="DIGICHer"
                width={99}
                height={44}
                style={{height: 44, width: 'auto', transform: `translateY(${OPTICAL_CENTER_OFFSET})`}}
            />
        </Link>
    )
}
