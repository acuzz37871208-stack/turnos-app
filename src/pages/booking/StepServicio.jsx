import { useBookingStore } from '../../store/bookingStore'
import { Card, Button, EmptyState } from '../../components/ui'

export default function StepServicio({ servicios, onNext, onBack }) {
  const { servicio, setServicio } = useBookingStore()

  function handleSelect(s) {
    setServicio(s)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-1">¿Qué servicio necesitás?</h2>
      <p className="text-sm text-muted mb-6">
        {servicio ? 'Servicio seleccionado. Podés continuar o elegir otro.' : 'Seleccioná uno para continuar'}
      </p>

      {servicios.length === 0
        ? <EmptyState icon="🛠️" title="No hay servicios disponibles" />
        : (
          <div className="flex flex-col gap-3 mb-8">
            {servicios.map(s => (
              <Card
                key={s.id}
                selected={servicio?.id === s.id}
                onClick={() => handleSelect(s)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-white">{s.nombre}</p>
                    <p className="text-sm text-muted mt-0.5">{s.duracion_min} min</p>
                    {s.descripcion && <p className="text-xs text-muted mt-1">{s.descripcion}</p>}
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    {s.precio ? (
                      <>
                        <p className="text-sm font-mono text-accent3">${s.precio.toLocaleString('es-AR')}</p>
                        {s.requiere_pago && (
                          <span className="text-xs text-yellow-400 bg-yellow-400 bg-opacity-10 px-2 py-0.5 rounded-full">
                            pago requerido
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted">sin cargo</span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      }

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack}>Volver</Button>
        <Button onClick={onNext} disabled={!servicio} className="flex-1">Continuar</Button>
      </div>
    </div>
  )
}
