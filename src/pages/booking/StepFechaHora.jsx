import { useState } from 'react'
import { useBookingStore } from '../../store/bookingStore'
import { useSlots } from '../../hooks/useSlots'
import { Button, Spinner } from '../../components/ui'

function getMinDate() {
  return new Date().toISOString().split('T')[0]
}

function getMaxDate() {
  const d = new Date()
  d.setDate(d.getDate() + 60)
  return d.toISOString().split('T')[0]
}

export default function StepFechaHora({ negocio, onNext, onBack }) {
  const { servicio, profesional, fecha, hora, setFecha, setHora } = useBookingStore()
  const [localFecha, setLocalFecha] = useState(fecha || '')

  const profId = profesional?.id === 'cualquiera' ? null : profesional?.id
  const { slots, loading } = useSlots(negocio?.id, profId, servicio?.id, localFecha)

  function handleFecha(e) {
    setLocalFecha(e.target.value)
    setFecha(e.target.value)
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
          onChange={handleFecha}
          min={getMinDate()}
          max={getMaxDate()}
          className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
        />
      </div>

      {/* Slots */}
      {localFecha && (
        <div className="mb-8">
          <label className="block text-sm text-muted mb-3">Horario</label>

          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : slots.length === 0 ? (
            <div className="text-center py-8 text-muted text-sm">
              <p className="text-2xl mb-2">😔</p>
              <p>No hay horarios disponibles para este día</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
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

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack}>Volver</Button>
        <Button onClick={onNext} disabled={!fecha || !hora} className="flex-1">Continuar</Button>
      </div>
    </div>
  )
}
