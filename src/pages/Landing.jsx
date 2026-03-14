import { useParams, useNavigate } from 'react-router-dom'
import { useNegocio } from '../hooks/useNegocio'
import { useBookingStore } from '../store/bookingStore'
import { Button, Spinner, EmptyState } from '../components/ui'

const tipoIconos = {
  clinica: '🏥',
  peluqueria: '✂️',
  cancha: '⚽',
  default: '🏢',
}

export default function Landing() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { negocio, servicios, loading, error } = useNegocio(slug)
  const setNegocio = useBookingStore(s => s.setNegocio)
  const resetBooking = useBookingStore(s => s.resetBooking)

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )

  if (error || !negocio) return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <EmptyState icon="🔍" title="Negocio no encontrado" description={`No existe ningún negocio con la URL "${slug}"`} />
    </div>
  )

  const icono = tipoIconos[negocio.tipo] || tipoIconos.default

  function handleReservar() {
    resetBooking()
    setNegocio(negocio)
    navigate(`/${slug}/reservar`)
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header del negocio */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/10 to-transparent pointer-events-none" />
        <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-surface border border-border rounded-2xl flex items-center justify-center text-3xl">
              {negocio.logo_url
                ? <img src={negocio.logo_url} alt={negocio.nombre} className="w-12 h-12 object-cover rounded-xl" />
                : icono
              }
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">{negocio.nombre}</h1>
              <p className="text-sm text-muted capitalize">{negocio.tipo}</p>
            </div>
          </div>

          {negocio.descripcion && (
            <p className="text-muted text-sm leading-relaxed mb-6">{negocio.descripcion}</p>
          )}

          <Button onClick={handleReservar} className="w-full py-3 text-base">
            Reservar turno
          </Button>
        </div>
      </div>

      {/* Servicios */}
      <div className="max-w-lg mx-auto px-4 pb-12">
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-4">Servicios</h2>

        {servicios.length === 0
          ? <EmptyState icon="🛠️" title="Sin servicios configurados" />
          : (
            <div className="flex flex-col gap-3">
              {servicios.map(s => (
                <div key={s.id} className="bg-surface border border-border rounded-xl px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{s.nombre}</p>
                    <p className="text-xs text-muted mt-0.5">{s.duracion_min} min</p>
                  </div>
                  {s.precio && (
                    <div className="text-right">
                      <p className="text-sm font-mono text-accent3">${s.precio.toLocaleString('es-AR')}</p>
                      {s.requiere_pago && (
                        <p className="text-xs text-muted">pago requerido</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        }

        <button
          onClick={() => navigate(`/${slug}/mis-turnos`)}
          className="mt-8 w-full text-sm text-muted hover:text-white transition-colors text-center"
        >
          Ver mis turnos reservados →
        </button>
      </div>
    </div>
  )
}
