import { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useBookingStore } from '../store/bookingStore'
import { Alert, Button } from '../components/ui'

export default function Confirmacion() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const { turnoConfirmado, servicio, fecha, hora } = useBookingStore()

  useEffect(() => {
    if (!turnoConfirmado) {
      navigate(`/${slug}`, { replace: true })
    }
  }, [navigate, slug, turnoConfirmado])

  if (!turnoConfirmado) return null

  const fechaFormateada = fecha
    ? new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long'
      })
    : ''
  const paymentStatus = searchParams.get('status') || searchParams.get('collection_status')
  const isPaymentReturn = Boolean(paymentStatus)
  const isPendingPayment = ['pending', 'in_process'].includes(paymentStatus)
  const isFailedPayment = ['failure', 'rejected', 'cancelled'].includes(paymentStatus)
  const title = isPendingPayment
    ? 'Pago pendiente'
    : isFailedPayment
      ? 'No pudimos confirmar el pago'
      : isPaymentReturn
        ? '¡Pago recibido!'
        : '¡Turno confirmado!'
  const description = isPendingPayment
    ? 'Tu turno queda pendiente hasta que MercadoPago confirme el cobro.'
    : isFailedPayment
      ? 'El turno no queda confirmado. Podés volver a intentar la reserva.'
      : isPaymentReturn
        ? `Te enviamos la confirmación a ${turnoConfirmado.cliente_email}`
        : `Te enviamos un recordatorio a ${turnoConfirmado.cliente_email}`
  const statusTone = isFailedPayment
    ? 'bg-accent2 bg-opacity-15 border-accent2 border-opacity-30 text-accent2'
    : isPendingPayment
      ? 'bg-yellow-400 bg-opacity-15 border-yellow-400 border-opacity-30 text-yellow-400'
      : 'bg-accent3 bg-opacity-15 border-accent3 border-opacity-30 text-accent3'
  const statusIcon = isFailedPayment ? '!' : isPendingPayment ? '…' : '✓'
  const estadoLabel = isPendingPayment
    ? 'Pago en revisión'
    : isFailedPayment
      ? 'No confirmado'
      : isPaymentReturn
        ? 'Pago aprobado'
        : 'Reserva confirmada'

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center page-enter">
        <div className={`w-20 h-20 border rounded-full flex items-center justify-center text-4xl mx-auto mb-6 ${statusTone}`}>
          {statusIcon}
        </div>

        <h1 className="text-2xl font-semibold text-white mb-2">{title}</h1>
        <p className="text-muted text-sm mb-8">
          {description}
        </p>

        <div className="bg-surface border border-border rounded-xl px-5 py-4 mb-8 text-left">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-mono text-muted uppercase tracking-widest mb-1">Tu turno</p>
              <p className="text-white font-medium">{servicio?.nombre || 'Servicio reservado'}</p>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusTone}`}>
              {estadoLabel}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-start justify-between gap-4">
              <span className="text-muted">Fecha</span>
              <span className="text-white text-right">{fechaFormateada || 'Registrada'}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-muted">Hora</span>
              <span className="text-white text-right">{hora ? `${hora} hs` : 'Registrada'}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-muted">Cliente</span>
              <span className="text-white text-right">{turnoConfirmado.cliente_nombre}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-muted">Contacto</span>
              <span className="text-white text-right break-all">{turnoConfirmado.cliente_telefono} · {turnoConfirmado.cliente_email}</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-4">
            <p className="text-xs text-muted">Código de reserva</p>
            <p className="text-xs font-mono text-white">
              {turnoConfirmado.id?.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        {(isPendingPayment || isFailedPayment) && (
          <Alert tone={isPendingPayment ? 'warning' : 'danger'} className="mb-6 text-left">
            {isPendingPayment
              ? 'Si el pago se aprueba en unos minutos, el turno aparecerá como confirmado en Mis turnos.'
              : 'Podés volver al inicio y reservar nuevamente el mismo u otro horario disponible.'}
          </Alert>
        )}

        {!isPendingPayment && !isFailedPayment && (
          <Alert tone="success" className="mb-6 text-left">
            Guardá esta pantalla o entrá a Mis turnos para revisar o cancelar la reserva más adelante.
          </Alert>
        )}

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => navigate(`/${slug}/mis-turnos?tel=${encodeURIComponent(turnoConfirmado.cliente_telefono)}&email=${encodeURIComponent(turnoConfirmado.cliente_email)}`)}
            className="w-full"
          >
            Consultar mi reserva
          </Button>
          <Button variant="ghost" onClick={() => navigate(`/${slug}`)} className="w-full">
            Volver al inicio
          </Button>
        </div>
      </div>
    </div>
  )
}
