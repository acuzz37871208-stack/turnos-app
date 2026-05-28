import { useBookingStore } from '../../store/bookingStore'
import { Card, Button, EmptyState } from '../../components/ui'

export default function StepProfesional({ profesionales, onNext, onBack }) {
  const { profesional, setProfesional } = useBookingStore()

  // Opción "sin preferencia"
  const opciones = [
    { id: 'cualquiera', nombre: 'Sin preferencia', descripcion: 'El primero disponible' },
    ...profesionales,
  ]

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-1">¿Con quién querés atenderte?</h2>
      <p className="text-sm text-muted mb-6">Podés elegir o dejarlo libre</p>

      {profesionales.length === 0 ? (
        <EmptyState title="No hay profesionales activos" description="El negocio todavía no configuró el equipo." />
      ) : (
        <div className="flex flex-col gap-3 mb-8">
          {opciones.map(p => (
            <Card
              key={p.id}
              selected={profesional?.id === p.id}
              onClick={() => setProfesional(p)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-border rounded-full flex items-center justify-center text-sm font-mono text-muted flex-shrink-0">
                  {p.id === 'cualquiera' ? '?' : p.nombre[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-white text-sm">{p.nombre}</p>
                  {p.descripcion && <p className="text-xs text-muted">{p.descripcion}</p>}
                  {p.especialidad && <p className="text-xs text-muted">{p.especialidad}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack}>Volver</Button>
        <Button onClick={onNext} disabled={!profesional} className="flex-1">Continuar</Button>
      </div>
    </div>
  )
}
