import { useState } from 'react'
import { useBookingStore } from '../../store/bookingStore'
import { supabase } from '../../lib/supabase'
import { Alert, Button, Spinner } from '../../components/ui'

async function getFunctionErrorMessage(error) {
  const fallback = 'No se pudo iniciar el pago. Intentá de nuevo.'

  if (!error) return fallback

  try {
    const payload = error.context ? await error.context.json() : null
    return payload?.error || payload?.message || error.message || fallback
  } catch {
    return error.message || fallback
  }
}

function formatFecha(fecha) {
  if (!fecha) return null
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export default function StepPago({ negocio, slug, onBack }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { turnoConfirmado, servicio, fecha, hora, cliente } = useBookingStore()
  const total = Number(servicio?.precio || 0)
  const fechaLabel = formatFecha(fecha)

  async function iniciarPago() {
    if (!turnoConfirmado?.id) {
      setError('No encontramos el turno reservado. Volvé al resumen y confirmalo nuevamente.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      // Llamar a tu Edge Function de Supabase que crea la preferencia en MercadoPago
      const { data, error: err } = await supabase.functions.invoke('crear-preferencia-mp', {
        body: {
          turno_id:    turnoConfirmado.id,
          negocio_id:  negocio.id,
          success_url: `${window.location.origin}/${slug}/confirmacion`,
          failure_url: `${window.location.origin}/${slug}/reservar`,
          notification_url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mp-webhook`,
        }
      })

      if (err) throw new Error(await getFunctionErrorMessage(err))
      if (!data?.init_point) throw new Error(data?.error || 'MercadoPago no devolvió un link de pago')

      // Redirigir al checkout de MercadoPago
      window.location.href = data.init_point
    } catch (err) {
      setError(err?.message || 'No se pudo iniciar el pago. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-1">Pago del turno</h2>
      <p className="text-sm text-muted mb-6">Tu horario ya está bloqueado. Completá el pago para dejarlo confirmado.</p>

      {/* Resumen del pago */}
      <div className="bg-surface border border-border rounded-xl px-5 py-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted">Servicio</p>
          <p className="text-sm text-white text-right">{servicio?.nombre}</p>
        </div>
        <div className="flex items-center justify-between gap-4 mt-3 pt-3 border-t border-border">
          <p className="text-sm text-muted">Turno</p>
          <p className="text-sm text-white text-right">
            {fechaLabel && hora ? `${fechaLabel} · ${hora} hs` : 'Reservado'}
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 mt-3 pt-3 border-t border-border">
          <p className="text-sm text-muted">Cliente</p>
          <p className="text-sm text-white text-right break-all">{cliente?.nombre}</p>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <p className="text-sm font-semibold text-white">Total</p>
          <p className="text-lg font-mono text-accent3">${total.toLocaleString('es-AR')}</p>
        </div>
      </div>

      {/* Logo MercadoPago */}
      <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-5 py-4 mb-6">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">MP</div>
        <div>
          <p className="text-sm text-white font-medium">MercadoPago</p>
          <p className="text-xs text-muted">Pago seguro · Tarjeta, débito, efectivo</p>
        </div>
      </div>

      <Alert tone="info" className="mb-4">
        Tu turno queda bloqueado por 30 minutos. Si el pago no se completa, el horario se libera automáticamente.
      </Alert>

      {error && (
        <Alert tone="danger" title="No pudimos abrir MercadoPago" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button variant="ghost" onClick={onBack} disabled={loading}>Volver</Button>
        <Button onClick={iniciarPago} disabled={loading} className="flex-1">
          {loading ? <Spinner size="sm" /> : error ? 'Reintentar pago' : 'Pagar con MercadoPago'}
        </Button>
      </div>
      <p className="text-center text-xs text-muted mt-4">
        Vas a salir momentáneamente a MercadoPago y después volver a la confirmación.
      </p>
    </div>
  )
}
