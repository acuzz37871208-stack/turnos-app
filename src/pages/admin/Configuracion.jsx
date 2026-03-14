import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Input, Button, Spinner } from '../../components/ui'

function Section({ title, description, children }) {
  return (
    <div className="border-b border-border pb-8 mb-8 last:border-0">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

export default function Configuracion() {
  const navigate = useNavigate()
  const [negocio, setNegocio] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [mpToken, setMpToken] = useState('')
  const [showToken, setShowToken] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/admin/login'); return }

      const { data } = await supabase
        .from('negocios')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      setNegocio(data)
      setMpToken(data?.mp_access_token ? '••••••••••••••••' : '')
      setLoading(false)
    }
    init()
  }, [])

  async function guardar(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    const updates = {
      nombre:      negocio.nombre,
      descripcion: negocio.descripcion,
      telefono:    negocio.telefono,
    }

    // Solo actualizar token si el usuario escribió algo nuevo (no los puntos de máscara)
    if (mpToken && !mpToken.includes('•')) {
      updates.mp_access_token = mpToken.trim()
    }

    await supabase.from('negocios').update(updates).eq('id', negocio.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function quitarToken() {
    if (!confirm('¿Quitás la integración con MercadoPago? Los servicios con pago requerido quedarán inactivos.')) return
    await supabase.from('negocios').update({ mp_access_token: null }).eq('id', negocio.id)
    setMpToken('')
  }

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )

  const tieneToken = negocio?.mp_access_token

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-white">Configuración</h1>
          <p className="text-xs text-muted font-mono">{negocio?.nombre}</p>
        </div>
        <button onClick={() => navigate('/admin')} className="text-sm text-muted hover:text-white transition-colors">
          ← Volver al panel
        </button>
      </header>

      <form onSubmit={guardar} className="max-w-lg mx-auto px-4 py-8">

        {/* Info del negocio */}
        <Section title="Información del negocio">
          <div className="flex flex-col gap-4">
            <Input
              label="Nombre"
              value={negocio?.nombre || ''}
              onChange={e => setNegocio(n => ({ ...n, nombre: e.target.value }))}
            />
            <Input
              label="Teléfono de contacto"
              value={negocio?.telefono || ''}
              onChange={e => setNegocio(n => ({ ...n, telefono: e.target.value }))}
              placeholder="2494123456"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-muted font-medium">Descripción (opcional)</label>
              <textarea
                value={negocio?.descripcion || ''}
                onChange={e => setNegocio(n => ({ ...n, descripcion: e.target.value }))}
                rows={3}
                className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-white placeholder-muted outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none"
                placeholder="Breve descripción de tu negocio..."
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Tu URL pública</label>
              <p className="text-sm font-mono text-accent">turnos.app/{negocio?.slug}</p>
            </div>
          </div>
        </Section>

        {/* MercadoPago */}
        <Section
          title="MercadoPago"
          description="Conectá tu cuenta para recibir pagos de los turnos que lo requieran"
        >
          {/* Estado de la conexión */}
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-4 ${
            tieneToken
              ? 'bg-accent3 bg-opacity-5 border-accent3 border-opacity-20'
              : 'bg-surface border-border'
          }`}>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tieneToken ? 'bg-accent3' : 'bg-muted'}`} />
            <div className="flex-1">
              <p className="text-sm text-white">
                {tieneToken ? 'Cuenta conectada' : 'Sin conectar'}
              </p>
              <p className="text-xs text-muted">
                {tieneToken
                  ? 'Los pagos se acreditan directo en tu cuenta de MP'
                  : 'Pegá tu Access Token para activar el cobro de turnos'}
              </p>
            </div>
            {tieneToken && (
              <button type="button" onClick={quitarToken} className="text-xs text-accent2 hover:underline flex-shrink-0">
                Desconectar
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-muted font-medium">
                Access Token de producción
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={mpToken}
                  onChange={e => setMpToken(e.target.value)}
                  onFocus={() => { if (mpToken.includes('•')) setMpToken('') }}
                  placeholder="APP_USR-..."
                  className="w-full bg-surface border border-border rounded-lg px-4 py-3 pr-12 text-sm text-white placeholder-muted outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white text-xs transition-colors"
                >
                  {showToken ? 'ocultar' : 'ver'}
                </button>
              </div>
            </div>

            {/* Instrucciones */}
            <div className="bg-surface border border-border rounded-xl px-4 py-3 text-xs text-muted space-y-1">
              <p className="text-white font-medium text-xs mb-2">¿Cómo obtengo mi Access Token?</p>
              <p>1. Entrá a <span className="text-accent">mercadopago.com.ar/developers</span></p>
              <p>2. Creá una aplicación</p>
              <p>3. Copiá el <strong className="text-white">Access Token de producción</strong></p>
              <p className="pt-1 text-yellow-400">⚠️ Nunca compartas este token con nadie</p>
            </div>
          </div>
        </Section>

        {/* Guardar */}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? <Spinner size="sm" /> : 'Guardar cambios'}
          </Button>
          {saved && (
            <span className="text-sm text-accent3 font-mono">✓ Guardado</span>
          )}
        </div>
      </form>
    </div>
  )
}
