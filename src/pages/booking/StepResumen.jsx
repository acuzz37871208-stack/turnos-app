import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBookingStore } from '../../store/bookingStore'
import { supabase } from '../../services/supabase'
import { Alert, Button, Spinner } from '../../components/ui'

const SIN_PROFESIONAL = ['cancha']

async function getFunctionErrorMessage(error) {
  const fallback = 'No pudimos crear el turno. Revisá los datos e intentá nuevamente.'

  try {
    const payload = error?.context ? await error.context.json() : null
    return payload?.error || fallback
  } catch {
    return fallback
  }
}

function Row({ label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between py-3 border-b border-border last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm text-white text-right ml-4">{value}</span>
    </div>
  )
}

export default function StepResumen({ negocio, slug, onNext, onBack }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { servicio, profesional, fecha, hora, cliente, setTurnoConfirmado } = useBookingStore()

  const requierePago = servicio?.requiere_pago
  const usaProfesional = !SIN_PROFESIONAL.includes(negocio?.tipo)

  const [hh, mm] = hora.split(':').map(Number)
  const finMin = hh * 60 + mm + (servicio?.duracion_min || 30)
  const horaFin = `${String(Math.floor(finMin/60)).padStart(2,'0')}:${String(finMin%60).padStart(2,'0')}`

  async function confirmar() {
    setLoading(true)
    setError(null)

    try {
      const profesionalId =
        (!usaProfesional || profesional?.id === 'cualquiera')
          ? null
          : profesional?.id

      const { data, error: err } = await supabase.functions.invoke('crear-turno', {
        body: {
          negocio_id:       negocio.id,
          servicio_id:      servicio.id,
          profesional_id:   profesionalId,
          cliente_nombre:   cliente.nombre,
          cliente_telefono: cliente.telefono,
          cliente_email:    cliente.email,
          nota:             cliente.nota || null,
          fecha,
          hora_inicio:      hora,
        },
      })

      if (err) {
        setError(await getFunctionErrorMessage(err))
        setLoading(false)
        return
      }

      if (!data?.turno) {
        throw new Error(data?.error || 'No pudimos crear el turno.')
      }

      setTurnoConfirmado(data.turno)

      // enviar notificación (no bloquea)
      enviarNotificacion(data.turno).catch(console.error)

      if (requierePago && onNext) {
        onNext()
      } else {
        navigate(`/${slug}/confirmacion`)
      }

    } catch (err) {
      console.error(err)
      setError('No pudimos crear el turno. Revisá los datos e intentá nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  async function enviarNotificacion(turno) {
    await supabase.functions.invoke('notificar-turno', {
      body: {
        turno_id: turno.id,
        negocio_id: negocio.id,
      }
    })
  }

  const fechaFormateada = new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-1">Resumen del turno</h2>
      <p className="text-sm text-muted mb-6">Revisá los datos antes de confirmar la reserva.</p>

      <div className="bg-surface border border-border rounded-xl px-5 mb-6">
        <Row label="Negocio"  value={negocio?.nombre} />
        <Row label="Servicio" value={servicio?.nombre} />
        {usaProfesional && profesional?.id !== 'cualquiera' && (
          <Row label="Profesional" value={profesional?.nombre} />
        )}
        <Row label="Fecha"    value={fechaFormateada} />
        <Row label="Hora"     value={`${hora} — ${horaFin}`} />
        <Row label="Nombre"   value={cliente.nombre} />
        <Row label="Teléfono" value={cliente.telefono} />
        <Row label="Email"    value={cliente.email} />
        {servicio?.precio && (
          <Row label="Precio" value={`$${Number(servicio.precio).toLocaleString('es-AR')}`} />
        )}
      </div>

      {requierePago && (
        <Alert tone="warning" title="Pago requerido" className="mb-6">
          Al continuar, el horario queda reservado por 30 minutos y te llevamos a MercadoPago.
        </Alert>
      )}

      {error && (
        <Alert tone="danger" className="mb-4">{error}</Alert>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button variant="ghost" onClick={onBack} disabled={loading}>
          Volver
        </Button>

        <Button onClick={confirmar} disabled={loading} className="flex-1">
          {loading ? <Spinner size="sm" /> : requierePago ? 'Ir al pago →' : 'Confirmar turno'}
        </Button>
      </div>
    </div>
  )
}
