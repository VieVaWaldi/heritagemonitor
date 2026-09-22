import Box from '@mui/material/Box'

// The actual animated banner from digicher-project.eu's own homepage (their
// diagonal stripes + wordmark, saved from their video CDN with permission —
// see git history for how). Sits full-bleed above DIGICHerSection's text,
// the same way LogoBanner breaks out of HeroLayout's padding.
//
// aspect-ratio (not a fixed height) is what keeps the crop honest: the
// source is 1920x1080 with the wordmark+tagline sitting in rows 484-798
// (measured from the source frame), i.e. the middle ~30% of its height. A
// fixed px height crops a *shrinking fraction* of the frame as the banner's
// full-bleed width grows with the viewport, which is what was cutting the
// tagline off entirely on wider screens. 16/5 keeps ~56% of the frame's
// height visible at any width, comfortably clearing that band. maxHeight
// is just a sanity cap for ultra-wide monitors.
export function DigicherBanner() {
    return (
        <Box sx={{width: '100%', aspectRatio: '16 / 5', maxHeight: 420, overflow: 'hidden', lineHeight: 0}}>
            <Box
                component="video"
                autoPlay
                loop
                muted
                playsInline
                poster="/images/digicher/banner-poster.jpg"
                sx={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}}
            >
                <source src="/mp4/digicher-banner.mp4" type="video/mp4" />
            </Box>
        </Box>
    )
}
