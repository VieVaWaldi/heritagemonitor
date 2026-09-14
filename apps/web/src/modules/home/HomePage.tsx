import {HeroPage} from './HeroPage'
import {DIGICHerSection} from './components/DIGICHerSection'
import {InformationSection} from './components/InformationSection'
import {Footer} from './components/Footer'

export function HomePage() {
    return (
        <>
            <HeroPage />
            <DIGICHerSection />
            <InformationSection />
            <Footer />
        </>
    )
}
