import { useParams, useNavigate } from 'react-router-dom'
import { useNegocio } from '../hooks/useNegocio'
import { useBookingStore } from '../store/bookingStore'
import { Button, EmptyState, LoadingScreen } from '../components/ui'

const tipoIconos = {
  clinica: 'CL',
  peluqueria: 'PL',
  cancha: 'CN',
  default: 'AG',
}

function ServiceCard({ servicio, onSelect }) {
  const precio = Number(servicio.precio || 0)

  return (
    <button
      onClick={() => onSelect(servicio)}
      className="bg-surface border border-border rounded-xl px-5 py-4 text-left hover:border-accent hover:bg-white/[0.02] transition-colors"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{servicio.nombre}</p>
          {servicio.descripcion && <p className="text-xs text-muted mt-1">{servicio.descripcion}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs text-muted">{servicio.duracion_min} min</span>
            {servicio.requiere_pago && (
              <span className="text-xs text-yellow-400 bg-yellow-400 bg-opacity-10 px-2 py-0.5 rounded-full">
                pago online
              </span>
            )}
          </div>
        </div>
        <div className="flex items-end justify-between gap-3 sm:block sm:flex-shrink-0 sm:text-right">
          {precio > 0 ? (
            <>
              <p className="text-sm font-mono text-accent3">${precio.toLocaleString('es-AR')}</p>
              <p className="text-xs text-accent">elegir</p>
            </>
          ) : (
            <>
              <p className="text-sm font-mono text-muted">sin cargo</p>
              <p className="text-xs text-accent">elegir</p>
            </>
          )}
        </div>
      </div>
    </button>
  )
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
        icon="?"
        title="Agenda no encontrada"
        description={`No encontramos una agenda publicada con la URL "${slug}".`}
        action={<Button onClick={() => navigate('/onboarding')} variant="ghost" className="text-sm px-3 py-2">Crear mi agenda</Button>}
      />
    </div>
  )

  const icono = tipoIconos[negocio.tipo] || tipoIconos.default
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
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-accent/10 to-transparent pointer-events-none" />
        <div className="max-w-lg mx-auto px-4 pt-8 pb-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-surface border border-border rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
              {negocio.logo_url
                ? <img src={negocio.logo_url} alt={negocio.nombre} className="w-12 h-12 object-cover rounded-xl" />
                : <span className="font-mono text-sm text-accent">{icono}</span>
              }
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-mono text-accent uppercase tracking-widest mb-1">Agenda online</p>
              <h1 className="text-2xl font-semibold text-white">{negocio.nombre}</h1>
              <p className="text-sm text-muted">{tipoLabel}</p>
            </div>
          </div>

          {negocio.descripcion && (
            <p className="text-muted text-sm leading-relaxed mb-6">{negocio.descripcion}</p>
          )}

        </div>
      </div>

      {/* Servicios */}
      <div className="max-w-lg mx-auto px-4 pb-12">
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xs font-mono text-muted uppercase tracking-widest">Servicios</h2>
            <p className="text-sm text-white mt-1">Elegí una opción para ver horarios disponibles.</p>
          </div>
        </div>

        {servicios.length === 0
          ? (
            <div className="bg-surface border border-border rounded-xl px-5 py-8">
              <EmptyState
                icon="..."
                title="Agenda en preparación"
                description="Este negocio todavía no publicó servicios para reservar."
              />
            </div>
          )
          : (
            <div className="flex flex-col gap-3">
              {servicios.map(s => (
                <ServiceCard key={s.id} servicio={s} onSelect={handleReservar} />
              ))}
            </div>
          )
        }

        <div className="mt-8 rounded-xl border border-border bg-surface px-5 py-4">
          <p className="text-sm text-white font-medium">¿Ya tenés una reserva?</p>
          <p className="text-xs text-muted mt-1">Consultala con el teléfono y email que usaste al reservar.</p>
          <button
            onClick={() => navigate(`/${slug}/mis-turnos`)}
            className="mt-3 text-sm text-accent hover:underline transition-colors"
          >
            Ver mis turnos
          </button>
        </div>
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
