import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Input, Button, Spinner, Alert } from '../../components/ui'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
    } else {
      navigate('/admin')
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm page-enter">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-accent bg-opacity-15 border border-accent border-opacity-30 rounded-2xl flex items-center justify-center text-accent text-xl mx-auto mb-4">
            ⚡
          </div>
          <h1 className="text-xl font-semibold text-white">Acceso al panel</h1>
          <p className="text-sm text-muted mt-1">Gestioná turnos, horarios, pagos y servicios.</p>
        </div>

        <div className="bg-surface border border-border rounded-xl px-4 py-3 mb-5">
          <div className="grid grid-cols-3 gap-2 text-center">
            {['Reservas', 'Pagos', 'Agenda'].map((item) => (
              <p key={item} className="text-xs text-muted">{item}</p>
            ))}
          </div>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required />
          <Input label="Contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />

          {error && <Alert tone="danger">{error}</Alert>}

          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? <Spinner size="sm" /> : 'Ingresar'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          ¿No tenés cuenta?{' '}
          <button onClick={() => navigate('/onboarding')} className="text-accent hover:underline">
            Registrá tu negocio
          </button>
        </p>
      </div>
    </div>
  )
}
