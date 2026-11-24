import { useEffect } from 'react'
import { useCatalog } from '../lib/store'
import { ColorLab } from './home/ColorLab'
import { Designs } from './home/Designs'
import { FeatureStrip, Hero, Navbar } from './home/Hero'
import { About, Contact, Faq, Footer, HowTo, Policies, Works } from './home/Sections'
import { Services } from './home/Services'

export default function Home() {
  const load = useCatalog((s) => s.load)
  useEffect(() => {
    load()
  }, [load])
  return (
    <>
      <Navbar />
      <main className="grain">
        <Hero />
        <FeatureStrip />
        <Services />
        <Designs />
        <ColorLab />
        <HowTo />
        <About />
        <Works />
        <Policies />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
