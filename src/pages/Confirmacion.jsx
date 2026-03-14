import { useNavigate, useParams } from 'react-router-dom'
import { useBookingStore } from '../store/bookingStore'
import { Button } from '../components/ui'

export default function Confirmacion() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const { turnoConfirmado, servicio, fecha, hora } = useBookingStore()

  if (!turnoConfirmado) {
    navigate(`/${slug}`)
    return null
  }

  const fechaFormateada = fecha
    ? new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long'
      })
    : ''

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center page-enter">
        {/* Ícono de éxito */}
        <div className="w-20 h-20 bg-accent3 bg-opacity-15 border border-accent3 border-opacity-30 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
          ✓
        </div>

        <h1 className="text-2xl font-semibold text-white mb-2">¡Turno confirmado!</h1>
        <p className="text-muted text-sm mb-8">
          Te enviamos un recordatorio a <span className="text-white">{turnoConfirmado.cliente_email}</span>
        </p>

        {/* Resumen compacto */}
        <div className="bg-surface border border-border rounded-xl px-5 py-4 mb-8 text-left">
          <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Tu turno</p>
          <p className="text-white font-medium">{servicio?.nombre}</p>
          <p className="text-muted text-sm mt-1">{fechaFormateada} · {hora}hs</p>
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs font-mono text-muted">
              # {turnoConfirmado.id?.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => navigate(`/${slug}/mis-turnos?tel=${turnoConfirmado.cliente_telefono}`)}
            className="w-full"
          >
            Ver mis turnos
          </Button>
          <Button variant="ghost" onClick={() => navigate(`/${slug}`)} className="w-full">
            Volver al inicio
          </Button>
        </div>
      </div>
    </div>
  )
}
