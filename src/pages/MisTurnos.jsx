import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Alert, Button, Input, Badge, Spinner, EmptyState, LoadingBlock } from '../components/ui'

function userErrorMessage(error) {
  if (!error) return 'No pudimos completar la operación. Intentá nuevamente.'
  if (error.message?.includes('permission') || error.message?.includes('policy')) {
    return 'No pudimos validar esos datos. Revisá teléfono y email.'
  }
  return 'No pudimos completar la operación. Intentá nuevamente.'
}

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
    <div className="bg-surface border border-border rounded-xl p-5 hover:border-muted transition-colors">
      <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium text-white">{turno.servicios?.nombre}</p>
          <p className="text-sm text-muted mt-0.5">{fecha} · {hora}hs</p>
          {turno.profesionales && (
            <p className="text-xs text-muted mt-0.5">con {turno.profesionales.nombre}</p>
          )}
          {statusHelp && <p className="text-xs text-muted mt-2">{statusHelp}</p>}
        </div>
        <div className="sm:ml-4">
          <Badge estado={turno.estado} />
        </div>
      </div>

      {cancelable && (
        <div className="pt-3 border-t border-border">
          <button
            onClick={() => onCancelar(turno.id)}
            className="text-xs text-accent2 hover:underline transition-colors"
          >
            Cancelar turno
          </button>
        </div>
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
      setError(userErrorMessage(err))
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
      setError(userErrorMessage(error))
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
        setError(userErrorMessage(err))
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
      <p className="text-sm text-muted mb-5">Ingresá los datos usados al reservar</p>

      <Alert tone="info" className="mb-6">
        Para proteger tus datos, solo mostramos reservas cuando teléfono y email coinciden.
      </Alert>

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

      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}

      {loading && <LoadingBlock title="Buscando turnos" description="Revisando las reservas asociadas a esos datos." />}

      {!loading && !buscado && (
        <div className="bg-surface border border-border rounded-xl px-5 py-6">
          <p className="text-sm font-medium text-white">Tus reservas aparecen acá</p>
          <p className="text-sm text-muted mt-1">
            Usá el mismo teléfono y email que ingresaste al reservar. Si pagaste con MercadoPago, el estado puede tardar unos minutos en actualizarse.
          </p>
          <div className="grid gap-2 mt-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-bg px-3 py-2">
              <p className="text-[11px] text-white">Estado actualizado</p>
            </div>
            <div className="rounded-lg border border-border bg-bg px-3 py-2">
              <p className="text-[11px] text-white">Cancelación segura</p>
            </div>
            <div className="rounded-lg border border-border bg-bg px-3 py-2">
              <p className="text-[11px] text-white">Historial privado</p>
            </div>
          </div>
        </div>
      )}

      {!loading && buscado && (
        turnos.length === 0
          ? <EmptyState icon="0" title="No encontramos turnos" description="Verificá que el teléfono y email coincidan con los usados al reservar." action={<Button variant="ghost" onClick={() => navigate(`/${slug}`)} className="text-sm px-3 py-2">Volver a la agenda</Button>} />
          : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-mono text-muted uppercase tracking-widest">
                  {turnos.length} turno{turnos.length !== 1 ? 's' : ''}
                </p>
                <button onClick={() => navigate(`/${slug}`)} className="text-xs text-muted hover:text-white transition-colors">
                  Reservar otro
                </button>
              </div>
              {turnos.map(t => (
                <TurnoCard key={t.id} turno={t} onCancelar={cancelar} />
              ))}
            </div>
          )
      )}
    </div>
  )
}
