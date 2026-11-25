import { useEffect } from 'react'
import { useCatalog } from '../lib/store'
import { Designs } from './home/Designs'
import { Hero, Navbar } from './home/Hero'
import { QuickBook } from './home/QuickBook'
import { About, Contact, Faq, Footer, Policies } from './home/Sections'
import { Services } from './home/Services'

export default function Home() {
  const load = useCatalog((s) => s.load)
  useEffect(() => {
    load()
  }, [load])
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <QuickBook />
        <Services />
        <Designs />
        <About />
        <Policies />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
