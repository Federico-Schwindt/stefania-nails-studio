import { useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ArrowUpRight, Sun, Users, ChartBar, ListChecks, DotsThree, CalendarBlank, Clock, GearSix, Info, ListBullets, Palette, SignOut } from '@phosphor-icons/react'
import { Logo } from '../../components/Logo'
import { api } from '../../lib/api'
import Today from './Today'
import Clients from './Clients'
import Reports from './Reports'
import Waitlist from './Waitlist'
import Agenda from './Agenda'
import Availability from './Availability'
import Designs from './Designs'
import Services from './Services'
import SettingsPage from './SettingsPage'
import Login from './Login'
import { AdminSheet, ErrorText, LoadState, useAction, useLoad } from './shared'

const checkSession = () => api.isAdmin()
const sections = [
  { path: 'hoy', title: 'Hoy', icon: Sun, component: Today },
  { path: 'agenda', title: 'Agenda', icon: CalendarBlank, component: Agenda },
  { path: 'clientas', title: 'Clientas', icon: Users, component: Clients },
  { path: 'reportes', title: 'Caja y reportes', icon: ChartBar, component: Reports },
  { path: 'espera', title: 'Lista de espera', icon: ListChecks, component: Waitlist },
  { path: 'disponibilidad', title: 'Disponibilidad', icon: Clock, component: Availability },
  { path: 'disenos', title: 'Diseños', icon: Palette, component: Designs },
  { path: 'servicios', title: 'Servicios', icon: ListBullets, component: Services },
  { path: 'ajustes', title: 'Ajustes', icon: GearSix, component: SettingsPage },
]

function Shell({ onExit }: { onExit: () => void }) {
  const [more, setMore] = useState(false)
  const path = useLocation().pathname.split('/').filter(Boolean).at(-1)
  const current = sections.find(item => item.path === path) ?? sections[0]
  const action = useAction()
  const accountLinks = <>
    <a href="#/" className="inline-flex items-center gap-2 rounded-full px-2 py-2 hover:bg-gris-50 lg:px-4"><ArrowUpRight size={18} />Ver sitio</a>
    <button disabled={action.busy} className="inline-flex items-center gap-2 rounded-full px-2 py-2 hover:bg-gris-50 lg:px-4" onClick={() => void action.run(async () => { await api.signOut(); onExit() })}><SignOut size={18} />Salir</button>
  </>
  return <div className="min-h-dvh bg-white font-sans text-ink">
    <aside className="fixed inset-y-0 left-0 hidden w-52 flex-col overflow-y-auto border-r border-gris/60 bg-white p-4 lg:flex xl:w-60 xl:p-6">
      <Logo className="mx-auto mb-6 mt-2 h-14 shrink-0 text-bordo" />
      <nav aria-label="Administración" className="space-y-1">{sections.map(({ path: route, title, icon: Icon }) =>
        <Link key={route} to={'/admin/' + route} aria-current={current.path === route ? 'page' : undefined} className={'flex items-center gap-3 rounded-full px-4 py-3 text-[15px] font-semibold ' + (current.path === route ? 'bg-bordo text-white' : 'text-choco hover:bg-bordo-50')}><Icon size={21} />{title}</Link>
      )}</nav>
      <div className="mt-auto grid justify-items-start gap-1 border-t border-gris/60 pt-4 text-sm text-choco">{accountLinks}</div>
    </aside>
    <div className="lg:ml-52 xl:ml-60">
      <div className="mx-auto max-w-[1600px] px-4 pb-28 pt-6 sm:px-7 lg:px-9 lg:pb-10">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-gris/60 pb-5">
          <h1 className="font-serif text-4xl text-bordo">{current.title}</h1>
          <div className="flex items-center gap-1 text-sm text-choco lg:hidden">{accountLinks}</div>
        </header>
        <ErrorText message={action.error} />
        {api.mode === 'demo' && <p className="mb-6 flex items-center gap-2 rounded-2xl bg-bordo-50 px-4 py-2 text-[13px] text-bordo"><Info className="shrink-0" size={17} />Modo demo: los datos quedan sólo en este navegador.</p>}
        <main><Routes>
          <Route index element={<Today />} />
          {sections.map(({ path: route, component: Page }) => <Route key={route} path={route} element={<Page />} />)}
          <Route path="*" element={<Navigate replace to="/admin/hoy" />} />
        </Routes></main>
      </div>
    </div>
    <nav aria-label="Administración móvil" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-gris bg-white px-1 pt-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] lg:hidden">
      {sections.slice(0, 4).map(({ path: route, title, icon: Icon }) => <Link key={route} to={'/admin/' + route} aria-current={current.path === route ? 'page' : undefined} className={'flex min-w-0 flex-col items-center gap-1 rounded-2xl py-1.5 text-[11px] font-semibold ' + (current.path === route ? 'bg-bordo-50 text-bordo' : 'text-choco')}><Icon size={20} />{route === 'reportes' ? 'Caja' : title}</Link>)}
      <button aria-expanded={more} aria-haspopup="dialog" onClick={() => setMore(true)} className={'flex flex-col items-center gap-1 rounded-2xl py-1.5 text-[11px] font-semibold ' + (sections.indexOf(current) >= 4 ? 'bg-bordo-50 text-bordo' : 'text-choco')}><DotsThree size={20} />Más</button>
    </nav>
    {more && <AdminSheet title="Más secciones" onClose={() => setMore(false)}>
      <nav className="grid gap-2">{sections.slice(4).map(({ path: route, title, icon: Icon }) =>
        <Link key={route} className="flex items-center gap-3 rounded-full px-4 py-3 font-semibold text-bordo hover:bg-bordo-50" to={'/admin/' + route} onClick={() => setMore(false)}><Icon size={20} />{title}</Link>)}</nav>
    </AdminSheet>}
  </div>
}

export default function AdminApp() {
  const session = useLoad(checkSession)
  const [authenticated, setAuthenticated] = useState<boolean>()
  const admin = authenticated ?? session.data
  if (admin === undefined) return <main className="mx-auto max-w-lg p-8"><LoadState {...session} /></main>
  return admin ? <Shell onExit={() => setAuthenticated(false)} /> : <Login onLogin={() => setAuthenticated(true)} />
}
