import { useState } from 'react'
import { useBookingStore } from '../../store/bookingStore'
import { useSlots } from '../../hooks/useSlots'
import { Button, LoadingBlock } from '../../components/ui'

function fechaLocalISO(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function sumarDias(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatearDia(fecha) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function getMinDate() {
  return fechaLocalISO()
}

function getMaxDate() {
  return fechaLocalISO(sumarDias(new Date(), 60))
}

export default function StepFechaHora({ negocio, onNext, onBack }) {
  const { servicio, profesional, fecha, hora, setFecha, setHora } = useBookingStore()
  const [localFecha, setLocalFecha] = useState(fecha || '')

  const profId = profesional?.id === 'cualquiera' ? null : profesional?.id
  const { slots, loading } = useSlots(negocio?.id, profId, servicio?.id, localFecha)
  const fechasRapidas = [0, 1, 2, 3].map((dias) => fechaLocalISO(sumarDias(new Date(), dias)))
  const disponibles = slots.filter((slot) => slot.disponible).length

  function seleccionarFecha(value) {
    setLocalFecha(value)
    setFecha(value)
    setHora(null)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-1">Elegí fecha y hora</h2>
      <p className="text-sm text-muted mb-6">Solo se muestran los horarios disponibles</p>

      {/* Fecha */}
      <div className="mb-6">
        <label className="block text-sm text-muted mb-2">Fecha</label>
        <input
          type="date"
          value={localFecha}
          onChange={(e) => seleccionarFecha(e.target.value)}
          min={getMinDate()}
          max={getMaxDate()}
          className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
        />
        <div className="grid grid-cols-4 gap-2 mt-3">
          {fechasRapidas.map((f, index) => (
            <button
              key={f}
              type="button"
              onClick={() => seleccionarFecha(f)}
              className={`border rounded-lg px-2 py-2 text-xs transition-colors ${
                localFecha === f
                  ? 'border-accent bg-accent bg-opacity-10 text-white'
                  : 'border-border text-muted hover:text-white hover:border-muted'
              }`}
            >
              {index === 0 ? 'Hoy' : index === 1 ? 'Mañana' : formatearDia(f)}
            </button>
          ))}
        </div>
      </div>

      {/* Slots */}
      {localFecha && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm text-muted">Horario</label>
            {!loading && slots.length > 0 && (
              <span className="text-xs text-muted">{disponibles} disponible{disponibles !== 1 ? 's' : ''}</span>
            )}
          </div>

          {loading ? (
            <LoadingBlock title="Buscando horarios" description="Estamos revisando la disponibilidad." />
          ) : slots.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl px-5 py-8 text-center text-sm">
              <p className="text-white font-medium">No hay horarios disponibles</p>
              <p className="text-muted mt-2">Probá con otra fecha cercana.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map(slot => (
                <button
                  key={slot.hora}
                  disabled={!slot.disponible}
                  onClick={() => setHora(slot.hora)}
                  className={`py-2.5 px-2 rounded-lg text-sm font-mono transition-all
                    ${!slot.disponible
                      ? 'bg-surface border border-border text-muted opacity-30 cursor-not-allowed line-through'
                      : hora === slot.hora
                        ? 'bg-accent text-white border border-accent'
                        : 'bg-surface border border-border text-white hover:border-accent'
                    }`}
                >
                  {slot.hora}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button variant="ghost" onClick={onBack}>Volver</Button>
        <Button onClick={onNext} disabled={!fecha || !hora} className="flex-1">Continuar</Button>
      </div>
    </div>
  )
}
