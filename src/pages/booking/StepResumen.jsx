import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBookingStore } from '../../store/bookingStore'
import { supabase } from '../../services/supabase'
import { Button, Spinner } from '../../components/ui'

const SIN_PROFESIONAL = ['cancha']

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

      // 🔒 1. verificar si ya existe turno
      const { data: existente } = await supabase
        .from('turnos')
        .select('id')
        .eq('fecha', fecha)
        .eq('hora_inicio', hora)
        .maybeSingle()

      if (existente) {
        setError('Ese horario ya fue reservado')
        setLoading(false)
        return
      }

      // ✅ 2. crear turno
      const { data, error: err } = await supabase
        .from('turnos')
        .insert({
          negocio_id:       negocio.id,
          servicio_id:      servicio.id,
          profesional_id:   profesionalId,
          cliente_nombre:   cliente.nombre,
          cliente_telefono: cliente.telefono,
          cliente_email:    cliente.email,
          nota:             cliente.nota || null,
          fecha,
          hora_inicio:      hora,
          hora_fin:         horaFin,
          estado:           requierePago ? 'pendiente_pago' : 'pendiente',
        })
        .select()
        .single()

      if (err) throw err

      setTurnoConfirmado(data)

      // enviar notificación (no bloquea)
      enviarNotificacion(data).catch(console.error)

      if (requierePago && onNext) {
        onNext()
      } else {
        navigate(`/${slug}/confirmacion`)
      }

    } catch (err) {
      console.error(err)
      setError('Error al crear el turno')
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
      <p className="text-sm text-muted mb-6">Revisá antes de confirmar</p>

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
        <div className="bg-yellow-500 bg-opacity-10 border border-yellow-500 border-opacity-30 rounded-xl px-5 py-4 mb-6">
          <p className="text-sm text-yellow-400">
            <span className="font-semibold">Este servicio requiere pago para confirmar.</span>
            {' '}Vas a ser redirigido al proceso de pago.
          </p>
        </div>
      )}

      {/* 🔴 ERROR VISIBLE */}
      {error && (
        <div className="bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30 rounded-xl px-5 py-3 mb-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
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