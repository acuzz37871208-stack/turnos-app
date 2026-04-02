import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button, Input, Badge, Spinner, EmptyState } from '../components/ui'

function TurnoCard({ turno, onCancelar }) {
  const fecha = new Date(turno.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  const cancelable = ['pendiente', 'confirmado', 'pendiente_pago'].includes(turno.estado)

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium text-white">{turno.servicios?.nombre}</p>
          <p className="text-sm text-muted mt-0.5">{fecha} · {turno.hora_inicio}hs</p>
          {turno.profesionales && (
            <p className="text-xs text-muted mt-0.5">con {turno.profesionales.nombre}</p>
          )}
        </div>
        <Badge estado={turno.estado} />
      </div>

      {cancelable && (
        <button
          onClick={() => onCancelar(turno.id)}
          className="text-xs text-accent2 hover:underline transition-colors"
        >
          Cancelar turno
        </button>
      )}
    </div>
  )
}

export default function MisTurnos() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [telefono, setTelefono] = useState(searchParams.get('tel') || '')
  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(false)
  const [buscado, setBuscado] = useState(false)
  const [error, setError] = useState(null)

  async function buscar(e) {
    e?.preventDefault()
    if (!telefono.trim()) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('turnos')
        .select('*, servicios(nombre), profesionales(nombre)')
        .eq('cliente_telefono', telefono.trim())
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false })

      if (err) throw err
      setTurnos(data || [])
      setBuscado(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function cancelar(id) {
    if (!confirm('¿Cancelar este turno?')) return
    const { error } = await supabase
      .from('turnos')
      .update({ estado: 'cancelado' })
      .eq('id', id)

    if (!error) buscar()
  }

  // Auto-buscar si llega con teléfono en la URL
  useEffect(() => {
    const tel = searchParams.get('tel')?.trim()

    if (!tel) return

    async function autoBuscar() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: err } = await supabase
          .from('turnos')
          .select('*, servicios(nombre), profesionales(nombre)')
          .eq('cliente_telefono', tel)
          .order('fecha', { ascending: false })
          .order('hora_inicio', { ascending: false })

        if (err) throw err
        setTurnos(data || [])
        setBuscado(true)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    autoBuscar()
  }, [searchParams])

  return (
    <div className="min-h-screen bg-bg px-4 py-8 max-w-lg mx-auto page-enter">
      <button
        onClick={() => navigate(`/${slug}`)}
        className="text-sm text-muted hover:text-white mb-6 flex items-center gap-1 transition-colors"
      >
        ← Volver
      </button>

      <h1 className="text-xl font-semibold text-white mb-1">Mis turnos</h1>
      <p className="text-sm text-muted mb-8">Ingresá tu teléfono para ver tus turnos</p>

      <form onSubmit={buscar} className="flex gap-3 mb-8">
        <div className="flex-1">
          <Input
            placeholder="Ej: 2494123456"
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
            type="tel"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? <Spinner size="sm" /> : 'Buscar'}
        </Button>
      </form>

      {error && <p className="text-sm text-accent2 mb-4">{error}</p>}

      {buscado && (
        turnos.length === 0
          ? <EmptyState icon="📭" title="No encontramos turnos" description="Verificá el número de teléfono ingresado" />
          : (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-mono text-muted uppercase tracking-widest">
                {turnos.length} turno{turnos.length !== 1 ? 's' : ''}
              </p>
              {turnos.map(t => (
                <TurnoCard key={t.id} turno={t} onCancelar={cancelar} />
              ))}
            </div>
          )
      )}
    </div>
  )
}
