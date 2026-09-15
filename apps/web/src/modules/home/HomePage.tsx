import {Navbar} from '@/common/components'
import {HeroPage} from './HeroPage'
import {DIGICHerSection} from './components/DIGICHerSection'
import {InformationSection} from './components/InformationSection'
import {Footer} from './components/Footer'

export function HomePage() {
    return (
        <>
            <Navbar sticky bordered />
            <HeroPage />
            <DIGICHerSection />
            <InformationSection />
            <Footer />
        </>
    )
}
