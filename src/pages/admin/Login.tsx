import { useState } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import { Logo } from '../../components/Logo'
import { Button, Field } from '../../components/ui'
import { api } from '../../lib/api'
import { DEMO_ADMIN_PASSWORD } from '../../lib/api/local'
import { ErrorText, useAction } from './shared'

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const action = useAction()
  async function login() {
    await api.signIn(email.trim(), password)
    if (!await api.isAdmin()) {
      await api.signOut()
      throw new Error('Esta cuenta no tiene acceso al panel.')
    }
    onLogin()
  }
  return <main className="grid min-h-dvh place-items-center bg-gris-50 p-4">
    <section className="w-full max-w-md rounded-[28px] bg-white p-7 ring-1 ring-gris sm:p-10">
      <div className="mb-7 flex justify-center"><Logo className="h-14 text-bordo" /></div>
      <h1 className="mb-7 text-center font-serif text-4xl text-bordo">Panel del estudio</h1>
      <form className="space-y-5" onSubmit={e => { e.preventDefault(); void action.run(login) }}>
        <Field label="Correo electrónico" type="email" autoComplete="username" required={api.mode !== 'demo'} value={email} onChange={e => setEmail(e.target.value)} />
        <Field label="Contraseña" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
        <ErrorText message={action.error} />
        <Button className="w-full" loading={action.busy} iconRight={<ArrowRight size={18} />}>Ingresar</Button>
      </form>
      {api.mode === 'demo' && <p className="mt-5 rounded-2xl bg-bordo-50 p-4 text-sm text-choco">Modo demo: los datos se guardan sólo en este navegador. Contraseña: {DEMO_ADMIN_PASSWORD}</p>}
    </section>
  </main>
}
