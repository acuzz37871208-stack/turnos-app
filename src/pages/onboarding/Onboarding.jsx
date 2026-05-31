import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { Input, Button, Spinner, StepIndicator, Alert } from '../../components/ui'

const STEPS = ['Cuenta', 'Negocio', 'Horarios', 'Servicios', '¡Listo!']
const TIPOS = ['clinica', 'peluqueria', 'cancha', 'otro']
const TIPO_LABELS = {
  clinica: 'Clínica',
  peluqueria: 'Peluquería',
  cancha: 'Cancha',
  otro: 'Otro',
}
const RESOURCE_LABELS = {
  clinica: 'Profesional',
  peluqueria: 'Profesional',
  cancha: 'Cancha',
  otro: 'Recurso',
}
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const STEP_COPY = [
  { title: 'Creá tu cuenta', description: 'Tu panel queda protegido y listo para administrar reservas.' },
  { title: 'Datos del negocio', description: 'Definí el nombre, rubro y link público de tu agenda.' },
  { title: 'Horarios de atención', description: 'Cargá una disponibilidad inicial para empezar a vender.' },
  { title: 'Servicios', description: 'Publicá al menos un servicio reservable.' },
  { title: 'Agenda publicada', description: 'Tu link ya está listo para compartir con clientes.' },
]

function errorMessage(error) {
  if (!error) return 'No pudimos guardar los datos. Intentá de nuevo.'
  if (error.code === '23505') return 'Esa URL ya está en uso. Probá con otro nombre.'
  if (error.message?.includes('violates foreign key constraint')) return 'La sesión no está sincronizada. Cerrá sesión y volvé a ingresar.'
  if (error.message?.includes('duplicate key')) return 'Ya existe un registro con esos datos.'
  return 'No pudimos guardar los datos. Intentá de nuevo.'
}

function authErrorMessage(error) {
  if (!error) return 'No pudimos validar la cuenta. Intentá de nuevo.'
  if (error.message?.toLowerCase().includes('already registered')) return 'Ese email ya tiene una cuenta. Ingresá desde el panel.'
  if (error.message?.toLowerCase().includes('invalid login')) return 'No pudimos iniciar sesión con esos datos.'
  return 'No pudimos validar la cuenta. Revisá los datos e intentá de nuevo.'
}

function horaAMinutos(hora) {
  const [horas, minutos] = hora.split(':').map(Number)
  return horas * 60 + minutos
}

function ErrorAlert({ children }) {
  if (!children) return null
  return <Alert tone="danger">{children}</Alert>
}

function OnboardingSummary({ step }) {
  const progress = Math.round(((step + 1) / STEPS.length) * 100)
  const items = [
    { label: 'Sin tarjeta', ready: step >= 0 },
    { label: 'Link propio', ready: step >= 1 },
    { label: 'Panel admin', ready: step >= 4 },
  ]

  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <p className="text-xs font-mono text-muted uppercase tracking-widest">Alta guiada</p>
          <p className="text-sm text-white mt-1">Tu agenda queda online al finalizar.</p>
        </div>
        <span className="text-sm font-mono text-accent">{progress}%</span>
      </div>
      <div className="h-2 rounded-full bg-bg overflow-hidden">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4">
        {items.map((item) => (
          <div key={item.label} className={`rounded-lg border px-2 py-2 text-center ${item.ready ? 'border-accent/40 bg-accent/10' : 'border-border'}`}>
            <p className={`text-[11px] ${item.ready ? 'text-white' : 'text-muted'}`}>{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [session, setSession] = useState(null)
  const [negocio, setNegocio] = useState({ nombre: '', tipo: 'peluqueria', slug: '', telefono: '' })
  const [horarios, setHorarios] = useState({ dias: [1,2,3,4,5], hora_inicio: '09:00', hora_fin: '18:00', intervalo: 30 })
  const [servicios, setServicios] = useState([{ nombre: '', duracion_min: 30, precio: '', requiere_pago: false }])
  const [negocioCreado, setNegocioCreado] = useState(null)
  const currentCopy = STEP_COPY[step]
  const resourceLabel = RESOURCE_LABELS[negocio.tipo] || 'Recurso'

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user }, error }) => {
      if (error || !user) {
        await supabase.auth.signOut()
        setSession(null)
        return
      }

      setSession({ user })
    })
  }, [])

  const next = () => setStep(s => s + 1)
  const back = () => setStep(s => s - 1)

  async function crearCuenta(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    if (!email.trim() || password.length < 8) {
      setError('Ingresá un email y una contraseña de al menos 8 caracteres.')
      setLoading(false)
      return
    }

    const { error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) { setError(authErrorMessage(signUpError)); setLoading(false); return }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) { setError(authErrorMessage(signInError)); setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    setSession(user ? { user } : null)
    setLoading(false); next()
  }

  async function usarOtraCuenta() {
    setLoading(true); setError(null)
    await supabase.auth.signOut()
    setSession(null)
    setEmail('')
    setPassword('')
    setLoading(false)
  }

  async function guardarNegocio(e) {
    e.preventDefault()
    setLoading(true); setError(null)

    if (!negocio.nombre.trim()) {
      setError('Ingresá el nombre del negocio.')
      setLoading(false)
      return
    }

    if (!negocio.slug || negocio.slug.length < 3) {
      setError('La URL de tu agenda tiene que tener al menos 3 caracteres.')
      setLoading(false)
      return
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      await supabase.auth.signOut()
      setSession(null)
      setError('Sesión expirada. Iniciá sesión de nuevo.')
      setLoading(false)
      setStep(0)
      return
    }

    const { data, error } = await supabase.from('negocios')
      .insert({
        ...negocio,
        label_profesional: RESOURCE_LABELS[negocio.tipo] || 'Recurso',
        owner_id: user.id,
        activo: false,
      })
      .select().single()
    if (error) { setError(errorMessage(error)); setLoading(false); return }
    setNegocioCreado(data)
    setLoading(false); next()
  }

  async function guardarHorarios(e) {
    e.preventDefault()
    setLoading(true); setError(null)

    if (!negocioCreado?.id) {
      setError('Primero tenés que guardar los datos del negocio.')
      setLoading(false)
      setStep(1)
      return
    }

    if (horarios.dias.length === 0) {
      setError('Elegí al menos un día de atención.')
      setLoading(false)
      return
    }

    if (horaAMinutos(horarios.hora_inicio) >= horaAMinutos(horarios.hora_fin)) {
      setError('El horario de cierre tiene que ser posterior al de apertura.')
      setLoading(false)
      return
    }

    try {
      const { data: prof, error: profError } = await supabase.from('profesionales')
        .insert({ negocio_id: negocioCreado.id, nombre: `${RESOURCE_LABELS[negocioCreado.tipo] || 'Recurso'} 1`, activo: true })
        .select().single()

      if (profError) throw profError

      const horariosRows = horarios.dias.map(dia => ({
        profesional_id: prof.id, dia_semana: dia,
        hora_inicio: horarios.hora_inicio, hora_fin: horarios.hora_fin,
      }))
      const { error: horariosError } = await supabase.from('horarios').insert(horariosRows)

      if (horariosError) throw horariosError

      setLoading(false); next()
    } catch (error) {
      setError(errorMessage(error))
      setLoading(false)
    }
  }

  async function guardarServicios(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    const serviciosValidos = servicios.filter(s => s.nombre.trim())

    const invalidService = serviciosValidos.find(s => Number(s.duracion_min) < 5 || (s.precio && Number(s.precio) < 0))
    if (invalidService) {
      setError('Revisá duración y precio de tus servicios.')
      setLoading(false)
      return
    }

    const rows = servicios.filter(s => s.nombre.trim()).map(s => ({
      negocio_id: negocioCreado.id, nombre: s.nombre,
      duracion_min: Number(s.duracion_min),
      precio: s.precio ? Number(s.precio) : null,
      requiere_pago: false, activo: true,
    }))

    if (rows.length === 0) {
      setError('Agregá al menos un servicio para publicar la agenda.')
      setLoading(false)
      return
    }

    try {
      const { error: serviciosError } = await supabase.from('servicios').insert(rows)
      if (serviciosError) throw serviciosError

      const { data, error: negocioError } = await supabase
        .from('negocios')
        .update({ activo: true })
        .eq('id', negocioCreado.id)
        .select()
        .single()

      if (negocioError) throw negocioError

      setNegocioCreado(data)
      setLoading(false); next()
    } catch (error) {
      setError(errorMessage(error))
      setLoading(false)
    }
  }

  function toggleDia(dia) {
    setHorarios(h => ({ ...h, dias: h.dias.includes(dia) ? h.dias.filter(d => d !== dia) : [...h.dias, dia] }))
  }

  function slugify(str) {
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  const urlBase = window.location.origin

  return (
    <div className="min-h-screen bg-bg px-4 py-8 max-w-2xl mx-auto page-enter sm:py-10">
      <div className="mb-8">
        <div className="w-10 h-10 bg-accent bg-opacity-15 border border-accent border-opacity-30 rounded-xl flex items-center justify-center text-accent text-sm font-mono mb-4">ON</div>
        <h1 className="text-2xl font-semibold text-white">Tu agenda online en minutos</h1>
        <p className="text-sm text-muted mt-1">Paso {step + 1} de {STEPS.length} · {currentCopy.description}</p>
      </div>

      <OnboardingSummary step={step} />
      <StepIndicator steps={STEPS} current={step} />

      <div key={step} className="page-enter bg-bg">
        {step === 0 && (
          session ? (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-medium text-white mb-1">Cuenta activa</h2>
              <div className="bg-surface border border-border rounded-xl px-5 py-4">
                <p className="text-sm text-muted mb-1">Vas a registrar el negocio con</p>
                <p className="text-white text-sm break-all">{session.user.email}</p>
              </div>
              <ErrorAlert>{error}</ErrorAlert>
              <Button type="button" onClick={next} disabled={loading} className="w-full mt-2">
                Continuar con esta cuenta
              </Button>
              <Button type="button" variant="ghost" onClick={usarOtraCuenta} disabled={loading} className="w-full">
                {loading ? <Spinner size="sm" /> : 'Usar otra cuenta'}
              </Button>
            </div>
          ) : (
            <form onSubmit={crearCuenta} className="flex flex-col gap-4">
              <h2 className="text-lg font-medium text-white mb-1">{currentCopy.title}</h2>
              <p className="text-sm text-muted -mt-3">No necesitás tarjeta ni configuración técnica para empezar.</p>
              <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required />
              <Input label="Contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="mínimo 8 caracteres" minLength={8} required />
              <ErrorAlert>{error}</ErrorAlert>
              <Button type="submit" disabled={loading} className="w-full mt-2">
                {loading ? <Spinner size="sm" /> : 'Continuar'}
              </Button>
              <p className="text-center text-sm text-muted">
                ¿Ya tenés cuenta?{' '}
                <button type="button" onClick={() => navigate('/admin/login')} className="text-accent hover:underline">Ingresá</button>
              </p>
            </form>
          )
        )}

        {step === 1 && (
          <form onSubmit={guardarNegocio} className="flex flex-col gap-4">
            <h2 className="text-lg font-medium text-white mb-1">{currentCopy.title}</h2>
            <p className="text-sm text-muted -mt-3">La URL pública queda lista al terminar el alta.</p>
            <Input label="Nombre del negocio" value={negocio.nombre}
              onChange={e => setNegocio(n => ({ ...n, nombre: e.target.value, slug: slugify(e.target.value) }))}
              placeholder="Peluquería Luna" required />
            <div>
              <label className="block text-sm text-muted mb-2">Tipo</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TIPOS.map(t => (
                  <button key={t} type="button" onClick={() => setNegocio(n => ({ ...n, tipo: t }))}
                    className={`min-h-11 py-2.5 px-4 rounded-lg text-sm border transition-all
                      ${negocio.tipo === t ? 'border-accent text-white bg-accent bg-opacity-10' : 'border-border text-muted hover:border-muted'}`}>
                    {TIPO_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Input label="URL de tu agenda" value={negocio.slug}
                onChange={e => setNegocio(n => ({ ...n, slug: slugify(e.target.value) }))}
                placeholder="peluqueria-luna" required />
              <p className="text-xs text-muted mt-1">{urlBase}/<span className="text-accent">{negocio.slug || 'tu-negocio'}</span></p>
            </div>
            <Input label="Teléfono (opcional)" value={negocio.telefono}
              onChange={e => setNegocio(n => ({ ...n, telefono: e.target.value }))}
              placeholder="2494123456" />
            <div className="bg-surface border border-border rounded-xl px-4 py-3">
              <p className="text-xs font-mono text-muted uppercase tracking-widest mb-2">Vista previa</p>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{negocio.nombre || 'Nombre del negocio'}</p>
                  <p className="text-xs text-muted mt-0.5">{TIPO_LABELS[negocio.tipo]} · recurso: {resourceLabel}</p>
                </div>
                <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-1 text-[11px] text-accent">link público</span>
              </div>
            </div>
            <ErrorAlert>{error}</ErrorAlert>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Button type="button" variant="ghost" onClick={back}>Volver</Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? <Spinner size="sm" /> : 'Continuar'}
              </Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={guardarHorarios} className="flex flex-col gap-5">
            <h2 className="text-lg font-medium text-white mb-1">{currentCopy.title}</h2>
            <p className="text-sm text-muted -mt-3">Podés ajustar horarios más específicos después desde el panel.</p>
            <Alert tone="info">
              Vamos a crear un {resourceLabel.toLowerCase()} inicial para que ya puedas recibir reservas. Luego podés agregar más desde Configuración.
            </Alert>
            <div>
              <label className="block text-sm text-muted mb-2">Días activos</label>
              <div className="grid grid-cols-7 gap-2">
                {DIAS.map((d, i) => (
                  <button key={i} type="button" onClick={() => toggleDia(i)}
                    className={`min-h-11 rounded-lg text-sm border transition-all
                      ${horarios.dias.includes(i) ? 'border-accent text-white bg-accent bg-opacity-10' : 'border-border text-muted'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Apertura" type="time" value={horarios.hora_inicio}
                onChange={e => setHorarios(h => ({ ...h, hora_inicio: e.target.value }))} />
              <Input label="Cierre" type="time" value={horarios.hora_fin}
                onChange={e => setHorarios(h => ({ ...h, hora_fin: e.target.value }))} />
            </div>
            <ErrorAlert>{error}</ErrorAlert>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Button type="button" variant="ghost" onClick={back}>Volver</Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? <Spinner size="sm" /> : 'Continuar'}
              </Button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={guardarServicios} className="flex flex-col gap-4">
            <h2 className="text-lg font-medium text-white mb-1">{currentCopy.title}</h2>
            <p className="text-sm text-muted -mt-3">El primer servicio alcanza para publicar. Luego podés sumar más.</p>
            <Alert tone="info">
              Si cargás un precio, se muestra en la agenda. El cobro online se activa después conectando MercadoPago desde el panel.
            </Alert>
            {servicios.map((s, i) => (
              <div key={i} className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted">Servicio {i+1}</span>
                  {servicios.length > 1 && (
                    <button type="button" onClick={() => setServicios(sv => sv.filter((_, j) => j !== i))}
                      className="text-xs text-accent2 hover:underline">Quitar</button>
                  )}
                </div>
                <Input placeholder="Nombre (ej: Corte de pelo)" value={s.nombre}
                  onChange={e => setServicios(sv => sv.map((x, j) => j===i ? {...x, nombre: e.target.value} : x))} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input label="Duración (min)" type="number" value={s.duracion_min} min={5}
                    onChange={e => setServicios(sv => sv.map((x, j) => j===i ? {...x, duracion_min: e.target.value} : x))} />
                  <Input label="Precio (opcional)" type="number" value={s.precio} placeholder="0"
                    onChange={e => setServicios(sv => sv.map((x, j) => j===i ? {...x, precio: e.target.value} : x))} />
                </div>
              </div>
            ))}
            <button type="button"
              onClick={() => setServicios(sv => [...sv, { nombre: '', duracion_min: 30, precio: '', requiere_pago: false }])}
              className="text-sm text-accent hover:underline text-left">
              + Agregar otro servicio
            </button>
            <ErrorAlert>{error}</ErrorAlert>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Button type="button" variant="ghost" onClick={back}>Volver</Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? <Spinner size="sm" /> : 'Continuar'}
              </Button>
            </div>
          </form>
        )}

        {step === 4 && (
          <div className="text-center py-4 page-enter">
            <div className="w-20 h-20 bg-accent3 bg-opacity-15 border border-accent3 border-opacity-30 rounded-full flex items-center justify-center text-2xl font-mono text-accent3 mx-auto mb-6">
              OK
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">{currentCopy.title}</h2>
            <p className="text-muted text-sm mb-6">Compartí este link con tus clientes o probalo como si fueras uno de ellos.</p>
            <div className="bg-surface border border-border rounded-xl px-5 py-4 mb-8">
              <p className="text-xs font-mono text-muted mb-1">Tu URL pública</p>
              <p className="text-accent font-mono text-sm break-all">{urlBase}/{negocioCreado?.slug}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-8 text-left">
              {['Publicada', 'Editable', 'Compartible'].map((item) => (
                <div key={item} className="rounded-lg border border-border px-3 py-3">
                  <p className="text-xs text-white">{item}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={() => window.open(`${urlBase}/${negocioCreado?.slug}`, '_blank', 'noopener,noreferrer')} variant="ghost" className="w-full">
                Ver agenda pública
              </Button>
              <Button onClick={() => navigate('/admin')} className="w-full">Ir al panel →</Button>
              <button
                onClick={() => navigator.clipboard.writeText(`${urlBase}/${negocioCreado?.slug}`)}
                className="text-sm text-muted hover:text-white transition-colors">
                Copiar link
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
