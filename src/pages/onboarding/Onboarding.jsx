import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { Input, Button, Spinner, StepIndicator } from '../../components/ui'

const STEPS = ['Cuenta', 'Negocio', 'Horarios', 'Servicios', '¡Listo!']
const TIPOS = ['clinica', 'peluqueria', 'cancha', 'otro']
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function errorMessage(error) {
  if (!error) return 'No pudimos guardar los datos. Intentá de nuevo.'
  if (error.code === '23505') return 'Esa URL ya está en uso. Probá con otro nombre.'
  if (error.message?.includes('violates foreign key constraint')) return 'La sesión no está sincronizada. Cerrá sesión y volvé a ingresar.'
  if (error.message?.includes('duplicate key')) return 'Ya existe un registro con esos datos.'
  return error.message || 'No pudimos guardar los datos. Intentá de nuevo.'
}

function horaAMinutos(hora) {
  const [horas, minutos] = hora.split(':').map(Number)
  return horas * 60 + minutos
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
    const { error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) { setError(signInError.message); setLoading(false); return }
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
      .insert({ ...negocio, owner_id: user.id, activo: false })
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
        .insert({ negocio_id: negocioCreado.id, nombre: 'Equipo', activo: true })
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
    const rows = servicios.filter(s => s.nombre.trim()).map(s => ({
      negocio_id: negocioCreado.id, nombre: s.nombre,
      duracion_min: Number(s.duracion_min),
      precio: s.precio ? Number(s.precio) : null,
      requiere_pago: s.requiere_pago, activo: true,
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
    <div className="min-h-screen bg-bg px-4 py-10 max-w-lg mx-auto page-enter">
      <div className="mb-8">
        <div className="w-10 h-10 bg-accent bg-opacity-15 border border-accent border-opacity-30 rounded-xl flex items-center justify-center text-accent text-lg mb-4">⚡</div>
        <h1 className="text-xl font-semibold text-white">Registrá tu negocio</h1>
        <p className="text-sm text-muted">Estás a 5 minutos de tener tu agenda online</p>
      </div>

      <StepIndicator steps={STEPS} current={step} />

      <div key={step} className="page-enter">
        {step === 0 && (
          session ? (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-medium text-white mb-1">Cuenta activa</h2>
              <div className="bg-surface border border-border rounded-xl px-5 py-4">
                <p className="text-sm text-muted mb-1">Vas a registrar el negocio con</p>
                <p className="text-white text-sm break-all">{session.user.email}</p>
              </div>
              {error && <p className="text-sm text-accent2">{error}</p>}
              <Button type="button" onClick={next} disabled={loading} className="w-full mt-2">
                Continuar con esta cuenta
              </Button>
              <Button type="button" variant="ghost" onClick={usarOtraCuenta} disabled={loading} className="w-full">
                {loading ? <Spinner size="sm" /> : 'Usar otra cuenta'}
              </Button>
            </div>
          ) : (
            <form onSubmit={crearCuenta} className="flex flex-col gap-4">
              <h2 className="text-lg font-medium text-white mb-1">Creá tu cuenta</h2>
              <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required />
              <Input label="Contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="mínimo 8 caracteres" minLength={8} required />
              {error && <p className="text-sm text-accent2">{error}</p>}
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
            <h2 className="text-lg font-medium text-white mb-1">Tu negocio</h2>
            <Input label="Nombre del negocio" value={negocio.nombre}
              onChange={e => setNegocio(n => ({ ...n, nombre: e.target.value, slug: slugify(e.target.value) }))}
              placeholder="Peluquería Luna" required />
            <div>
              <label className="block text-sm text-muted mb-2">Tipo</label>
              <div className="grid grid-cols-2 gap-2">
                {TIPOS.map(t => (
                  <button key={t} type="button" onClick={() => setNegocio(n => ({ ...n, tipo: t }))}
                    className={`py-2.5 px-4 rounded-lg text-sm capitalize border transition-all
                      ${negocio.tipo === t ? 'border-accent text-white bg-accent bg-opacity-10' : 'border-border text-muted hover:border-muted'}`}>
                    {t}
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
            {error && <p className="text-sm text-accent2">{error}</p>}
            <div className="flex gap-3 mt-2">
              <Button type="button" variant="ghost" onClick={back}>Volver</Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? <Spinner size="sm" /> : 'Continuar'}
              </Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={guardarHorarios} className="flex flex-col gap-5">
            <h2 className="text-lg font-medium text-white mb-1">Horarios de atención</h2>
            <div>
              <label className="block text-sm text-muted mb-2">Días activos</label>
              <div className="flex gap-2 flex-wrap">
                {DIAS.map((d, i) => (
                  <button key={i} type="button" onClick={() => toggleDia(i)}
                    className={`w-11 py-2 rounded-lg text-sm border transition-all
                      ${horarios.dias.includes(i) ? 'border-accent text-white bg-accent bg-opacity-10' : 'border-border text-muted'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Apertura" type="time" value={horarios.hora_inicio}
                onChange={e => setHorarios(h => ({ ...h, hora_inicio: e.target.value }))} />
              <Input label="Cierre" type="time" value={horarios.hora_fin}
                onChange={e => setHorarios(h => ({ ...h, hora_fin: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-muted mb-2">Intervalo entre turnos</label>
              <div className="flex gap-2">
                {[15,20,30,45,60].map(m => (
                  <button key={m} type="button" onClick={() => setHorarios(h => ({ ...h, intervalo: m }))}
                    className={`px-4 py-2 rounded-lg text-sm border transition-all
                      ${horarios.intervalo === m ? 'border-accent text-white bg-accent bg-opacity-10' : 'border-border text-muted'}`}>
                    {m}min
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-2">
              <Button type="button" variant="ghost" onClick={back}>Volver</Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? <Spinner size="sm" /> : 'Continuar'}
              </Button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={guardarServicios} className="flex flex-col gap-4">
            <h2 className="text-lg font-medium text-white mb-1">Tus servicios</h2>
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
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Duración (min)" type="number" value={s.duracion_min} min={5}
                    onChange={e => setServicios(sv => sv.map((x, j) => j===i ? {...x, duracion_min: e.target.value} : x))} />
                  <Input label="Precio (opcional)" type="number" value={s.precio} placeholder="0"
                    onChange={e => setServicios(sv => sv.map((x, j) => j===i ? {...x, precio: e.target.value} : x))} />
                </div>
                {s.precio && (
                  <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
                    <input type="checkbox" checked={s.requiere_pago}
                      onChange={e => setServicios(sv => sv.map((x, j) => j===i ? {...x, requiere_pago: e.target.checked} : x))}
                      className="accent-purple-500" />
                    Requiere pago para confirmar el turno
                  </label>
                )}
              </div>
            ))}
            <button type="button"
              onClick={() => setServicios(sv => [...sv, { nombre: '', duracion_min: 30, precio: '', requiere_pago: false }])}
              className="text-sm text-accent hover:underline text-left">
              + Agregar otro servicio
            </button>
            {error && <p className="text-sm text-accent2">{error}</p>}
            <div className="flex gap-3 mt-2">
              <Button type="button" variant="ghost" onClick={back}>Volver</Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? <Spinner size="sm" /> : 'Continuar'}
              </Button>
            </div>
          </form>
        )}

        {step === 4 && (
          <div className="text-center py-4 page-enter">
            <div className="w-20 h-20 bg-accent3 bg-opacity-15 border border-accent3 border-opacity-30 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
              🎉
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">¡Todo listo!</h2>
            <p className="text-muted text-sm mb-6">Tu agenda está activa y lista para recibir turnos</p>
            <div className="bg-surface border border-border rounded-xl px-5 py-4 mb-8">
              <p className="text-xs font-mono text-muted mb-1">Tu URL pública</p>
              <p className="text-accent font-mono text-sm break-all">{urlBase}/{negocioCreado?.slug}</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={() => navigate('/admin')} className="w-full">Ir al panel →</Button>
              <button
                onClick={() => navigator.clipboard.writeText(`${urlBase}/${negocioCreado?.slug}`)}
                className="text-sm text-muted hover:text-white transition-colors">
                📋 Copiar link
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
