import { useEffect } from 'react'
import { useCatalog } from '../lib/store'
import { ColorLab } from './home/ColorLab'
import { Designs } from './home/Designs'
import { Hero } from './home/Hero'
import { About, Contact, Footer, HowTo, Policies, Works } from './home/Sections'
import { Services } from './home/Services'

export default function Home() {
  const load = useCatalog((s) => s.load)
  useEffect(() => {
    load()
  }, [load])
  return (
    <main className="grain">
      <Hero />
      <Services />
      <Designs />
      <ColorLab />
      <About />
      <HowTo />
      <Works />
      <Policies />
      <Contact />
      <Footer />
    </main>
  )
}
