import Box from '@mui/material/Box'
import type {HeroLayoutSlots} from './types'

// WIP per spec — mobile hero layout isn't designed yet. Same slot contract as
// HeroDesktopLayout so filling this in later is a drop-in swap, no changes to
// HeroPage.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- keeps the HeroLayoutSlots contract visible until this is implemented
export function HeroMobileLayout(slots: HeroLayoutSlots) {
    return <Box sx={{minHeight: '100dvh'}} />
}
