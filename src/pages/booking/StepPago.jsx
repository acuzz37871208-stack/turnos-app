import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBookingStore } from '../../store/bookingStore'
import { supabase } from '../../lib/supabase'
import { Button, Spinner } from '../../components/ui'

export default function StepPago({ negocio, slug, onBack }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { turnoConfirmado, servicio } = useBookingStore()

  async function iniciarPago() {
    setLoading(true)
    setError(null)
    try {
      // Llamar a tu Edge Function de Supabase que crea la preferencia en MercadoPago
      const { data, error: err } = await supabase.functions.invoke('crear-preferencia-mp', {
        body: {
          turno_id:    turnoConfirmado.id,
          negocio_id:  negocio.id,
          titulo:      servicio.nombre,
          precio:      servicio.precio,
          email:       turnoConfirmado.cliente_email,
          success_url: `${window.location.origin}/${slug}/confirmacion`,
          failure_url: `${window.location.origin}/${slug}/reservar`,
        }
      })

      if (err) throw err

      // Redirigir al checkout de MercadoPago
      window.location.href = data.init_point
    } catch (err) {
      setError('No se pudo iniciar el pago. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-1">Pago del turno</h2>
      <p className="text-sm text-muted mb-6">El turno queda reservado una vez que el pago sea procesado</p>

      {/* Resumen del pago */}
      <div className="bg-surface border border-border rounded-xl px-5 py-4 mb-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">Servicio</p>
          <p className="text-sm text-white">{servicio?.nombre}</p>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <p className="text-sm font-semibold text-white">Total</p>
          <p className="text-lg font-mono text-accent3">${servicio?.precio?.toLocaleString('es-AR')}</p>
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

      {error && (
        <div className="bg-accent2 bg-opacity-10 border border-accent2 border-opacity-30 rounded-xl px-4 py-3 mb-4">
          <p className="text-sm text-accent2">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} disabled={loading}>Volver</Button>
        <Button onClick={iniciarPago} disabled={loading} className="flex-1">
          {loading ? <Spinner size="sm" /> : 'Pagar con MercadoPago'}
        </Button>
      </div>

      <p className="text-xs text-muted text-center mt-4">
        Tu turno quedó reservado. Si no completás el pago en 30 minutos, se libera automáticamente.
      </p>
    </div>
  )
}
