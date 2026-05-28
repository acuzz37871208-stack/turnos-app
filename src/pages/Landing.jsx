import { useParams, useNavigate } from 'react-router-dom'
import { useNegocio } from '../hooks/useNegocio'
import { useBookingStore } from '../store/bookingStore'
import { Button, EmptyState, LoadingScreen } from '../components/ui'

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
  const setServicio = useBookingStore(s => s.setServicio)
  const resetBooking = useBookingStore(s => s.resetBooking)

  if (loading) return (
    <LoadingScreen title="Cargando agenda" description="Estamos buscando los servicios disponibles." />
  )

  if (error || !negocio) return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <EmptyState
        icon="🔍"
        title="Agenda no encontrada"
        description={`No encontramos una agenda publicada con la URL "${slug}".`}
        action={<Button onClick={() => navigate('/onboarding')} variant="ghost" className="text-sm px-3 py-2">Crear mi agenda</Button>}
      />
    </div>
  )

  const icono = tipoIconos[negocio.tipo] || tipoIconos.default
  const serviciosConPrecio = servicios.filter((servicio) => Number(servicio.precio) > 0)
  const precioDesde = serviciosConPrecio.length
    ? Math.min(...serviciosConPrecio.map((servicio) => Number(servicio.precio)))
    : null
  const tipoLabel = {
    clinica: 'Clínica',
    peluqueria: 'Peluquería',
    cancha: 'Cancha',
    otro: 'Agenda',
  }[negocio.tipo] || 'Agenda'

  function handleReservar(servicio = null) {
    resetBooking()
    setNegocio(negocio)
    if (servicio) setServicio(servicio)
    navigate(`/${slug}/reservar`)
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      {/* Header del negocio */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/10 to-transparent pointer-events-none" />
        <div className="max-w-lg mx-auto px-4 pt-10 pb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-surface border border-border rounded-2xl flex items-center justify-center text-3xl">
              {negocio.logo_url
                ? <img src={negocio.logo_url} alt={negocio.nombre} className="w-12 h-12 object-cover rounded-xl" />
                : icono
              }
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">{negocio.nombre}</h1>
              <p className="text-sm text-muted">{tipoLabel}</p>
            </div>
          </div>

          {negocio.descripcion && (
            <p className="text-muted text-sm leading-relaxed mb-6">{negocio.descripcion}</p>
          )}

          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="bg-surface border border-border rounded-lg px-3 py-3">
              <p className="text-lg font-mono text-white">{servicios.length}</p>
              <p className="text-xs text-muted">servicios</p>
            </div>
            <div className="bg-surface border border-border rounded-lg px-3 py-3">
              <p className="text-lg font-mono text-white">{precioDesde ? `$${precioDesde.toLocaleString('es-AR')}` : '-'}</p>
              <p className="text-xs text-muted">desde</p>
            </div>
            <div className="bg-surface border border-border rounded-lg px-3 py-3">
              <p className="text-lg font-mono text-white">24h</p>
              <p className="text-xs text-muted">online</p>
            </div>
          </div>

          <Button onClick={() => handleReservar()} disabled={servicios.length === 0} className="w-full py-3 text-base">
            Reservar turno
          </Button>
        </div>
      </div>

      {/* Servicios */}
      <div className="max-w-lg mx-auto px-4 pb-12">
        <h2 className="text-xs font-mono text-muted uppercase tracking-widest mb-4">Servicios</h2>

        {servicios.length === 0
          ? (
            <div className="bg-surface border border-border rounded-xl px-5 py-8">
              <EmptyState
                icon="🛠️"
                title="Agenda en preparación"
                description="Este negocio todavía no publicó servicios para reservar."
              />
            </div>
          )
          : (
            <div className="flex flex-col gap-3">
              {servicios.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleReservar(s)}
                  className="bg-surface border border-border rounded-xl px-5 py-4 text-left flex items-center justify-between gap-4 hover:border-accent transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{s.nombre}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {s.duracion_min} min{s.requiere_pago ? ' · pago online' : ''}
                    </p>
                  </div>
                  {s.precio && (
                    <div className="text-right">
                      <p className="text-sm font-mono text-accent3">${s.precio.toLocaleString('es-AR')}</p>
                      <p className="text-xs text-muted">elegir</p>
                    </div>
                  )}
                </button>
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

      {servicios.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-bg/95 border-t border-border px-4 py-3 backdrop-blur">
          <div className="max-w-lg mx-auto">
            <Button onClick={() => handleReservar()} className="w-full py-3">
              Reservar turno
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
