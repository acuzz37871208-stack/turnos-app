import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button, Input, Badge, Spinner, EmptyState } from '../components/ui'

function TurnoCard({ turno, onCancelar }) {
  const fecha = new Date(turno.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  const cancelable = ['pendiente', 'confirmado', 'pendiente_pago'].includes(turno.estado)
  const hora = turno.hora_inicio?.slice(0, 5)
  const statusHelp = {
    pendiente: 'El negocio todavía puede confirmar este turno.',
    pendiente_pago: 'Estamos esperando confirmación de pago.',
    confirmado: 'Tu turno está confirmado.',
    atendido: 'Este turno ya fue atendido.',
    cancelado: 'Este turno fue cancelado.',
  }[turno.estado]

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium text-white">{turno.servicios?.nombre}</p>
          <p className="text-sm text-muted mt-0.5">{fecha} · {hora}hs</p>
          {turno.profesionales && (
            <p className="text-xs text-muted mt-0.5">con {turno.profesionales.nombre}</p>
          )}
          {statusHelp && <p className="text-xs text-muted mt-2">{statusHelp}</p>}
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
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(false)
  const [buscado, setBuscado] = useState(false)
  const [error, setError] = useState(null)
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const telefonoValido = telefono.replace(/\D/g, '').length >= 8
  const canSearch = telefonoValido && emailValido

  function mapTurno(row) {
    return {
      id: row.id,
      fecha: row.fecha,
      hora_inicio: row.hora_inicio,
      estado: row.estado,
      servicios: { nombre: row.servicio_nombre },
      profesionales: row.profesional_nombre ? { nombre: row.profesional_nombre } : null,
    }
  }

  async function buscar(e) {
    e?.preventDefault()
    if (!telefono.trim() || !email.trim()) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .rpc('buscar_turnos_cliente', {
          p_slug: slug,
          p_telefono: telefono.trim(),
          p_email: email.trim().toLowerCase(),
        })

      if (err) throw err
      setTurnos((data || []).map(mapTurno))
      setBuscado(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function cancelar(id) {
    if (!confirm('¿Cancelar este turno?')) return
    const { data, error } = await supabase
      .rpc('cancelar_turno_cliente', {
        p_turno_id: id,
        p_slug: slug,
        p_telefono: telefono.trim(),
        p_email: email.trim().toLowerCase(),
      })

    if (error) {
      setError(error.message)
      return
    }

    if (!data) {
      setError('No pudimos cancelar ese turno. Verificá los datos ingresados.')
      return
    }

    buscar()
  }

  // Auto-buscar si llega desde la confirmación con teléfono y email.
  useEffect(() => {
    const tel = searchParams.get('tel')?.trim()
    const mail = searchParams.get('email')?.trim()

    if (!tel || !mail) return

    async function autoBuscar() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: err } = await supabase
          .rpc('buscar_turnos_cliente', {
            p_slug: slug,
            p_telefono: tel,
            p_email: mail.toLowerCase(),
          })

        if (err) throw err
        setTurnos((data || []).map(mapTurno))
        setBuscado(true)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    autoBuscar()
  }, [searchParams, slug])

  return (
    <div className="min-h-screen bg-bg px-4 py-8 max-w-lg mx-auto page-enter">
      <button
        onClick={() => navigate(`/${slug}`)}
        className="text-sm text-muted hover:text-white mb-6 flex items-center gap-1 transition-colors"
      >
        ← Volver
      </button>

      <h1 className="text-xl font-semibold text-white mb-1">Mis turnos</h1>
      <p className="text-sm text-muted mb-8">Ingresá los datos usados al reservar</p>

      <form onSubmit={buscar} className="flex flex-col gap-3 mb-8">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Teléfono"
            placeholder="Ej: 2494123456"
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
            type="tel"
            inputMode="tel"
            error={telefono && !telefonoValido ? 'Ingresá un teléfono válido' : null}
          />
          <Input
            label="Email"
            placeholder="tu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            error={email && !emailValido ? 'Ingresá un email válido' : null}
          />
        </div>
        <Button type="submit" disabled={loading || !canSearch} className="w-full sm:w-auto sm:self-end">
          {loading ? <Spinner size="sm" /> : 'Buscar'}
        </Button>
      </form>

      {error && <p className="text-sm text-accent2 mb-4">{error}</p>}

      {buscado && (
        turnos.length === 0
          ? <EmptyState icon="📭" title="No encontramos turnos" description="Verificá que el teléfono y email coincidan con los usados al reservar." />
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
