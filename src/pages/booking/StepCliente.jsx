import { useBookingStore } from '../../store/bookingStore'
import { Input, Button } from '../../components/ui'

export default function StepCliente({ onNext, onBack }) {
  const { cliente, setCliente } = useBookingStore()

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente.email.trim())
  const telefonoValido = cliente.telefono.replace(/\D/g, '').length >= 8
  const nombreValido = cliente.nombre.trim().length >= 2
  const valid = nombreValido && telefonoValido && emailValido

  function handleChange(e) {
    setCliente({ [e.target.name]: e.target.value })
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-1">Tus datos</h2>
      <p className="text-sm text-muted mb-6">Para enviarte la confirmación del turno</p>

      <div className="flex flex-col gap-4 mb-8">
        <Input
          label="Nombre completo"
          name="nombre"
          value={cliente.nombre}
          onChange={handleChange}
          placeholder="Juan García"
          error={cliente.nombre && !nombreValido ? 'Ingresá al menos 2 caracteres' : null}
          required
        />
        <Input
          label="Teléfono"
          name="telefono"
          value={cliente.telefono}
          onChange={handleChange}
          placeholder="2494123456"
          type="tel"
          inputMode="tel"
          error={cliente.telefono && !telefonoValido ? 'Ingresá un teléfono válido' : null}
          required
        />
        <Input
          label="Email"
          name="email"
          value={cliente.email}
          onChange={handleChange}
          placeholder="juan@mail.com"
          type="email"
          error={cliente.email && !emailValido ? 'Ingresá un email válido' : null}
          required
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-muted font-medium">Nota para el negocio (opcional)</label>
          <textarea
            name="nota"
            value={cliente.nota}
            onChange={handleChange}
            placeholder="Ej: primera vez, prefiero por la tarde..."
            rows={3}
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-white placeholder-muted outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack}>Volver</Button>
        <Button onClick={onNext} disabled={!valid} className="flex-1">Continuar</Button>
      </div>
    </div>
  )
}
