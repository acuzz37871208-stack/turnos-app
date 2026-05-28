import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { applyBusinessTheme } from '../../lib/theme'
import { Input, Button, Spinner, LoadingScreen } from '../../components/ui'

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const TIPOS_NEGOCIO = ['clinica', 'peluqueria', 'cancha', 'otro']
const SIN_PROFESIONAL = ['cancha']

function needsProfesional(tipo) { return !SIN_PROFESIONAL.includes(tipo) }

function Section({ title, description, children, action }) {
  return (
    <div className="border-b border-border pb-10 mb-10 last:border-0 last:mb-0">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {description && <p className="text-xs text-muted mt-0.5 max-w-sm">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function Tag({ children, color = 'purple' }) {
  const colors = {
    purple: 'bg-accent bg-opacity-10 text-accent border-accent border-opacity-20',
    green:  'bg-accent3 bg-opacity-10 text-accent3 border-accent3 border-opacity-20',
    red:    'bg-accent2 bg-opacity-10 text-accent2 border-accent2 border-opacity-20',
    yellow: 'bg-yellow-400 bg-opacity-10 text-yellow-400 border-yellow-400 border-opacity-20',
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono border ${colors[color]}`}>{children}</span>
}

async function getFunctionErrorMessage(error) {
  const fallback = 'No pudimos guardar los cambios. Intentá de nuevo.'

  if (!error) return fallback

  try {
    const payload = error.context ? await error.context.json() : null
    return payload?.error || payload?.message || error.message || fallback
  } catch {
    return error.message || fallback
  }
}

export default function Configuracion() {
  const navigate = useNavigate()
  const [negocio, setNegocio] = useState(null)
  const [checklist, setChecklist] = useState({ servicios: 0, profesionales: 0, horarios: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('general')
  const [publishSaving, setPublishSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const loadChecklist = useCallback(async (negocioId) => {
    const [{ data: servicios }, { data: profesionales }] = await Promise.all([
      supabase.from('servicios').select('id').eq('negocio_id', negocioId).eq('activo', true),
      supabase.from('profesionales').select('id').eq('negocio_id', negocioId).eq('activo', true),
    ])

    const profesionalIds = (profesionales || []).map((p) => p.id)
    const { data: horarios } = profesionalIds.length > 0
      ? await supabase.from('horarios').select('id').in('profesional_id', profesionalIds)
      : { data: [] }

    setChecklist({
      servicios: servicios?.length || 0,
      profesionales: profesionales?.length || 0,
      horarios: horarios?.length || 0,
    })
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/admin/login'); return }
      const { data } = await supabase.from('negocios').select('*').eq('owner_id', session.user.id).single()
      setNegocio(data)
      if (data) await loadChecklist(data.id)
      setLoading(false)
    }
    init()
  }, [loadChecklist, navigate])

  if (loading) return <LoadingScreen title="Cargando configuración" description="Buscando los datos de tu agenda." />

  const publicUrl = `${window.location.origin}/${negocio?.slug}`
  const readyToPublish = checklist.servicios > 0 && checklist.horarios > 0

  async function togglePublicacion() {
    if (!negocio || (!negocio.activo && !readyToPublish)) return
    setPublishSaving(true)
    const nextActivo = !negocio.activo
    const { data } = await supabase
      .from('negocios')
      .update({ activo: nextActivo })
      .eq('id', negocio.id)
      .select()
      .single()

    if (data) setNegocio(data)
    setPublishSaving(false)
  }

  async function copiarLink() {
    await navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'servicios', label: 'Servicios' },
    ...(needsProfesional(negocio?.tipo) ? [{ id: 'equipo', label: negocio?.label_profesional || 'Equipo' }] : []),
    { id: 'horarios', label: 'Horarios' },
    { id: 'pagos', label: 'Pagos' },
    { id: 'apariencia', label: 'Apariencia' },
  ]

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-white">Configuración</h1>
          <p className="text-xs text-muted font-mono">{negocio?.nombre}</p>
        </div>
        <button onClick={() => navigate('/admin')} className="text-sm text-muted hover:text-white transition-colors">← Panel</button>
      </header>
      <div className="border-b border-border px-6">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-all ${activeTab === t.id ? 'border-accent text-white' : 'border-transparent text-muted hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <BusinessStatus
          negocio={negocio}
          checklist={checklist}
          publicUrl={publicUrl}
          copied={copied}
          publishSaving={publishSaving}
          readyToPublish={readyToPublish}
          onCopy={copiarLink}
          onTogglePublicacion={togglePublicacion}
        />

        {activeTab === 'general'   && <TabGeneral   negocio={negocio} setNegocio={setNegocio} publicUrl={publicUrl} />}
        {activeTab === 'servicios' && <TabServicios  negocio={negocio} onChange={() => loadChecklist(negocio.id)} />}
        {activeTab === 'equipo'    && <TabEquipo     negocio={negocio} onChange={() => loadChecklist(negocio.id)} />}
        {activeTab === 'horarios'  && <TabHorarios   negocio={negocio} onChange={() => loadChecklist(negocio.id)} />}
        {activeTab === 'pagos'      && <TabPagos      negocio={negocio} setNegocio={setNegocio} />}
        {activeTab === 'apariencia' && <TabApariencia negocio={negocio} setNegocio={setNegocio} />}
      </div>
    </div>
  )
}

function BusinessStatus({ negocio, checklist, publicUrl, copied, publishSaving, readyToPublish, onCopy, onTogglePublicacion }) {
  const equipoLabel = needsProfesional(negocio?.tipo)
    ? 'Equipo activo'
    : negocio?.tipo === 'cancha'
      ? 'Canchas activas'
      : 'Recursos activos'

  const items = [
    { label: 'Servicios activos', value: checklist.servicios, ready: checklist.servicios > 0 },
    { label: equipoLabel, value: checklist.profesionales, ready: checklist.profesionales > 0 },
    { label: 'Horarios cargados', value: checklist.horarios, ready: checklist.horarios > 0 },
    { label: 'MercadoPago', value: negocio?.mp_access_token ? 'Conectado' : 'Opcional', ready: true },
  ]

  return (
    <section className="bg-surface border border-border rounded-xl p-5 mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Tag color={negocio?.activo ? 'green' : 'yellow'}>{negocio?.activo ? 'publicada' : 'borrador'}</Tag>
            {!readyToPublish && <Tag color="red">faltan datos</Tag>}
          </div>
          <h2 className="text-white font-semibold">Estado de la agenda</h2>
          <p className="text-sm text-muted mt-1">
            {negocio?.activo
              ? 'Tu agenda está visible para clientes.'
              : readyToPublish
                ? 'La agenda está lista para publicarse.'
                : 'Completá los puntos pendientes antes de publicarla.'}
          </p>
          <p className="text-xs font-mono text-accent mt-3 break-all">{publicUrl}</p>
        </div>
        <div className="flex gap-2 sm:flex-col sm:min-w-36">
          <Button type="button" onClick={onCopy} variant="ghost" className="text-sm px-3 py-2 flex-1">
            {copied ? 'Copiado' : 'Copiar link'}
          </Button>
          <Button
            type="button"
            onClick={onTogglePublicacion}
            disabled={publishSaving || (!negocio?.activo && !readyToPublish)}
            className="text-sm px-3 py-2 flex-1"
          >
            {publishSaving ? <Spinner size="sm" /> : negocio?.activo ? 'Pausar' : 'Publicar'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-5">
        {items.map((item) => (
          <div
            key={item.label}
            className="border border-border rounded-lg px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-white">{item.label}</span>
              <Tag color={item.ready ? 'green' : 'red'}>{item.value}</Tag>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function TabGeneral({ negocio, setNegocio, publicUrl }) {
  const [form, setForm] = useState({ ...negocio })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function guardar(e) {
    e.preventDefault(); setSaving(true)
    await supabase.from('negocios').update({ nombre: form.nombre, descripcion: form.descripcion, telefono: form.telefono, tipo: form.tipo, label_profesional: form.label_profesional }).eq('id', negocio.id)
    setNegocio(n => ({ ...n, ...form })); setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-6">
      <Section title="Información del negocio">
        <div className="flex flex-col gap-4">
          <Input label="Nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          <Input label="Teléfono" value={form.telefono || ''} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="2494123456" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted font-medium">Descripción</label>
            <textarea value={form.descripcion || ''} rows={3} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-white placeholder-muted outline-none focus:border-accent resize-none" />
          </div>
          <div>
            <label className="block text-sm text-muted mb-2">Tipo de negocio</label>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS_NEGOCIO.map(t => (
                <button key={t} type="button" onClick={() => setForm(f => ({ ...f, tipo: t }))}
                  className={`py-2.5 px-4 rounded-lg text-sm capitalize border transition-all ${form.tipo === t ? 'border-accent text-white bg-accent bg-opacity-10' : 'border-border text-muted hover:border-muted'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          {!needsProfesional(form.tipo) && (
            <Input label="¿Cómo llamás a tus espacios?" value={form.label_profesional || ''}
              onChange={e => setForm(f => ({ ...f, label_profesional: e.target.value }))} placeholder="Cancha, Sala, Espacio..." />
          )}
          <div>
            <label className="block text-sm text-muted mb-1">URL pública</label>
            <p className="text-sm font-mono text-accent break-all">{publicUrl}</p>
          </div>
        </div>
      </Section>
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={saving} className="flex-1">{saving ? <Spinner size="sm" /> : 'Guardar cambios'}</Button>
        {saved && <span className="text-sm text-accent3 font-mono">✓ Guardado</span>}
      </div>
    </form>
  )
}

function TabServicios({ negocio, onChange }) {
  const [servicios, setServicios] = useState([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(null)
  const [nuevo, setNuevo] = useState(false)

  const fetchServicios = useCallback(async () => {
    const { data } = await supabase.from('servicios').select('*').eq('negocio_id', negocio.id).order('nombre')
    setServicios(data || []); setLoading(false)
  }, [negocio.id])

  useEffect(() => { fetchServicios() }, [fetchServicios])

  async function toggleActivo(s) {
    await supabase.from('servicios').update({ activo: !s.activo }).eq('id', s.id); fetchServicios(); onChange?.()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este servicio?')) return
    await supabase.from('servicios').delete().eq('id', id); fetchServicios(); onChange?.()
  }

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>

  return (
    <Section title="Servicios" description="Lo que ofrecés a tus clientes"
      action={<Button onClick={() => { setNuevo(true); setEditando(null) }} className="text-sm px-3 py-2">+ Agregar</Button>}>
      {nuevo && <FormServicio negocioId={negocio.id} onSave={() => { setNuevo(false); fetchServicios(); onChange?.() }} onCancel={() => setNuevo(false)} />}
      {servicios.length === 0 && !nuevo ? (
        <p className="text-sm text-muted text-center py-8">No hay servicios. Agregá uno.</p>
      ) : (
        <div className="flex flex-col gap-3 mt-4">
          {servicios.map(s => editando === s.id
            ? <FormServicio key={s.id} negocioId={negocio.id} servicio={s} onSave={() => { setEditando(null); fetchServicios(); onChange?.() }} onCancel={() => setEditando(null)} />
            : (
              <div key={s.id} className="bg-surface border border-border rounded-xl px-5 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white text-sm">{s.nombre}</p>
                      {!s.activo && <Tag color="red">inactivo</Tag>}
                      {s.requiere_pago && <Tag color="yellow">pago requerido</Tag>}
                    </div>
                    <p className="text-xs text-muted mt-0.5">{s.duracion_min} min{s.precio ? ` · $${s.precio.toLocaleString('es-AR')}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button onClick={() => setEditando(s.id)} className="text-xs text-muted hover:text-white">Editar</button>
                    <button onClick={() => toggleActivo(s)} className={`text-xs ${s.activo ? 'text-muted hover:text-accent2' : 'text-accent3'}`}>{s.activo ? 'Desactivar' : 'Activar'}</button>
                    <button onClick={() => eliminar(s.id)} className="text-xs text-accent2 hover:underline">Eliminar</button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </Section>
  )
}

function FormServicio({ negocioId, servicio, onSave, onCancel }) {
  const [form, setForm] = useState(servicio || { nombre: '', duracion_min: 30, precio: '', requiere_pago: false, descripcion: '' })
  const [saving, setSaving] = useState(false)

  async function guardar(e) {
    e.preventDefault(); setSaving(true)
    const data = { negocio_id: negocioId, nombre: form.nombre, descripcion: form.descripcion || null, duracion_min: Number(form.duracion_min), precio: form.precio ? Number(form.precio) : null, requiere_pago: form.requiere_pago, activo: true }
    if (servicio?.id) { await supabase.from('servicios').update(data).eq('id', servicio.id) }
    else { await supabase.from('servicios').insert(data) }
    setSaving(false); onSave()
  }

  return (
    <form onSubmit={guardar} className="bg-surface border border-accent border-opacity-30 rounded-xl p-4 flex flex-col gap-3">
      <p className="text-xs font-mono text-accent">{servicio ? 'Editando servicio' : 'Nuevo servicio'}</p>
      <Input placeholder="Nombre del servicio" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
      <Input placeholder="Descripción breve (opcional)" value={form.descripcion || ''} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Duración (min)" type="number" min={5} value={form.duracion_min} onChange={e => setForm(f => ({ ...f, duracion_min: e.target.value }))} />
        <Input label="Precio (opcional)" type="number" value={form.precio || ''} placeholder="0" onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} />
      </div>
      {form.precio && (
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
          <input type="checkbox" checked={form.requiere_pago} onChange={e => setForm(f => ({ ...f, requiere_pago: e.target.checked }))} className="accent-purple-500" />
          Requiere pago para confirmar
        </label>
      )}
      <div className="flex gap-2 mt-1">
        <Button type="button" variant="ghost" onClick={onCancel} className="text-sm px-3 py-2">Cancelar</Button>
        <Button type="submit" disabled={saving || !form.nombre} className="flex-1 text-sm">{saving ? <Spinner size="sm" /> : 'Guardar'}</Button>
      </div>
    </form>
  )
}

function TabEquipo({ negocio, onChange }) {
  const [profesionales, setProfesionales] = useState([])
  const [loading, setLoading] = useState(true)
  const [nuevo, setNuevo] = useState(false)
  const [editando, setEditando] = useState(null)
  const label = negocio?.label_profesional || 'Profesional'

  const fetchProfesionales = useCallback(async () => {
    const { data } = await supabase.from('profesionales').select('*').eq('negocio_id', negocio.id).order('nombre')
    setProfesionales(data || []); setLoading(false)
  }, [negocio.id])

  useEffect(() => { fetchProfesionales() }, [fetchProfesionales])

  async function toggleActivo(p) {
    await supabase.from('profesionales').update({ activo: !p.activo }).eq('id', p.id); fetchProfesionales(); onChange?.()
  }

  async function eliminar(id) {
    if (!confirm(`¿Eliminar?`)) return
    await supabase.from('profesionales').delete().eq('id', id); fetchProfesionales(); onChange?.()
  }

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>

  return (
    <Section title={label} description={`Quiénes atienden en tu negocio`}
      action={<Button onClick={() => { setNuevo(true); setEditando(null) }} className="text-sm px-3 py-2">+ Agregar</Button>}>
      {nuevo && <FormProfesional negocioId={negocio.id} label={label} onSave={() => { setNuevo(false); fetchProfesionales(); onChange?.() }} onCancel={() => setNuevo(false)} />}
      {profesionales.length === 0 && !nuevo ? (
        <p className="text-sm text-muted text-center py-8">No hay {label.toLowerCase()}s. Agregá uno.</p>
      ) : (
        <div className="flex flex-col gap-3 mt-4">
          {profesionales.map(p => editando === p.id
            ? <FormProfesional key={p.id} negocioId={negocio.id} profesional={p} label={label} onSave={() => { setEditando(null); fetchProfesionales(); onChange?.() }} onCancel={() => setEditando(null)} />
            : (
              <div key={p.id} className="bg-surface border border-border rounded-xl px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-border rounded-full flex items-center justify-center text-sm font-mono text-muted">{p.nombre[0].toUpperCase()}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{p.nombre}</p>
                      {!p.activo && <Tag color="red">inactivo</Tag>}
                    </div>
                    {p.especialidad && <p className="text-xs text-muted">{p.especialidad}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditando(p.id)} className="text-xs text-muted hover:text-white">Editar</button>
                  <button onClick={() => toggleActivo(p)} className={`text-xs ${p.activo ? 'text-muted hover:text-accent2' : 'text-accent3'}`}>{p.activo ? 'Desactivar' : 'Activar'}</button>
                  <button onClick={() => eliminar(p.id)} className="text-xs text-accent2 hover:underline">Eliminar</button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </Section>
  )
}

function FormProfesional({ negocioId, profesional, label, onSave, onCancel }) {
  const [form, setForm] = useState(profesional || { nombre: '', especialidad: '' })
  const [saving, setSaving] = useState(false)

  async function guardar(e) {
    e.preventDefault(); setSaving(true)
    const data = { negocio_id: negocioId, nombre: form.nombre, especialidad: form.especialidad || null, activo: true }
    if (profesional?.id) { await supabase.from('profesionales').update(data).eq('id', profesional.id) }
    else { await supabase.from('profesionales').insert(data) }
    setSaving(false); onSave()
  }

  return (
    <form onSubmit={guardar} className="bg-surface border border-accent border-opacity-30 rounded-xl p-4 flex flex-col gap-3">
      <p className="text-xs font-mono text-accent">{profesional ? `Editando ${label}` : `Nuevo ${label}`}</p>
      <Input placeholder={`Nombre`} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
      <Input placeholder="Especialidad (opcional)" value={form.especialidad || ''} onChange={e => setForm(f => ({ ...f, especialidad: e.target.value }))} />
      <div className="flex gap-2 mt-1">
        <Button type="button" variant="ghost" onClick={onCancel} className="text-sm px-3 py-2">Cancelar</Button>
        <Button type="submit" disabled={saving || !form.nombre} className="flex-1 text-sm">{saving ? <Spinner size="sm" /> : 'Guardar'}</Button>
      </div>
    </form>
  )
}

function TabHorarios({ negocio, onChange }) {
  const [profesionales, setProfesionales] = useState([])
  const [horarios, setHorarios] = useState({})
  const [especiales, setEspeciales] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [nuevaFecha, setNuevaFecha] = useState({ fecha: '', tipo: 'cerrado', hora_inicio: '09:00', hora_fin: '18:00', motivo: '' })

  const fetchData = useCallback(async () => {
    const [{ data: profs }, { data: hors }, { data: esp }] = await Promise.all([
      supabase.from('profesionales').select('*').eq('negocio_id', negocio.id).eq('activo', true),
      supabase.from('horarios').select('*'),
      supabase.from('horarios_especiales').select('*').eq('negocio_id', negocio.id).order('fecha'),
    ])
    setProfesionales(profs || [])
    setEspeciales(esp || [])
    const map = {}
    ;(profs || []).forEach(p => { map[p.id] = {}; for (let d = 0; d < 7; d++) map[p.id][d] = null })
    ;(hors || []).forEach(h => { if (map[h.profesional_id]) map[h.profesional_id][h.dia_semana] = { hora_inicio: h.hora_inicio, hora_fin: h.hora_fin, id: h.id } })
    setHorarios(map); setLoading(false)
  }, [negocio.id])

  useEffect(() => { fetchData() }, [fetchData])

  function toggleDia(profId, dia) {
    setHorarios(h => ({ ...h, [profId]: { ...h[profId], [dia]: h[profId][dia] ? null : { hora_inicio: '09:00', hora_fin: '18:00' } } }))
  }

  function updateHorario(profId, dia, field, value) {
    setHorarios(h => ({ ...h, [profId]: { ...h[profId], [dia]: { ...h[profId][dia], [field]: value } } }))
  }

  async function guardarHorarios() {
    setSaving(true)
    for (const profId of Object.keys(horarios)) {
      for (let dia = 0; dia < 7; dia++) {
        const h = horarios[profId][dia]
        const existing = h?.id
        if (h && h.hora_inicio && h.hora_fin) {
          if (existing) { await supabase.from('horarios').update({ hora_inicio: h.hora_inicio, hora_fin: h.hora_fin }).eq('id', existing) }
          else { await supabase.from('horarios').insert({ profesional_id: profId, dia_semana: dia, hora_inicio: h.hora_inicio, hora_fin: h.hora_fin }) }
        } else if (!h && existing) { await supabase.from('horarios').delete().eq('id', existing) }
      }
    }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000); fetchData(); onChange?.()
  }

  async function agregarEspecial() {
    if (!nuevaFecha.fecha) return
    await supabase.from('horarios_especiales').insert({ negocio_id: negocio.id, ...nuevaFecha })
    setNuevaFecha({ fecha: '', tipo: 'cerrado', hora_inicio: '09:00', hora_fin: '18:00', motivo: '' }); fetchData(); onChange?.()
  }

  async function eliminarEspecial(id) {
    await supabase.from('horarios_especiales').delete().eq('id', id); fetchData(); onChange?.()
  }

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>

  return (
    <div>
      <Section title="Horarios regulares" description="Días y horarios de atención por miembro del equipo">
        {profesionales.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">Primero agregá miembros en la pestaña Equipo.</p>
        ) : profesionales.map(prof => (
          <div key={prof.id} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-border rounded-full flex items-center justify-center text-xs font-mono text-muted">{prof.nombre[0].toUpperCase()}</div>
              <p className="text-sm font-medium text-white">{prof.nombre}</p>
            </div>
            <div className="flex flex-col gap-2">
              {DIAS.map((dia, i) => {
                const h = horarios[prof.id]?.[i]
                const activo = !!h
                return (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${activo ? 'border-border bg-surface' : 'border-border bg-surface opacity-50'}`}>
                    <button type="button" onClick={() => toggleDia(prof.id, i)}
                      className={`w-4 h-4 rounded border-2 flex-shrink-0 transition-all ${activo ? 'bg-accent border-accent' : 'border-muted'}`} />
                    <span className="text-sm text-white w-20 flex-shrink-0">{dia}</span>
                    {activo ? (
                      <div className="flex items-center gap-2 ml-auto">
                        <input type="time" value={h.hora_inicio} onChange={e => updateHorario(prof.id, i, 'hora_inicio', e.target.value)}
                          className="bg-bg border border-border rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-accent" />
                        <span className="text-muted text-xs">a</span>
                        <input type="time" value={h.hora_fin} onChange={e => updateHorario(prof.id, i, 'hora_fin', e.target.value)}
                          className="bg-bg border border-border rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-accent" />
                      </div>
                    ) : <span className="text-xs text-muted ml-auto">Cerrado</span>}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {profesionales.length > 0 && (
          <div className="flex items-center gap-4 mt-4">
            <Button onClick={guardarHorarios} disabled={saving} className="flex-1">{saving ? <Spinner size="sm" /> : 'Guardar horarios'}</Button>
            {saved && <span className="text-sm text-accent3 font-mono">✓ Guardado</span>}
          </div>
        )}
      </Section>

      <Section title="Días especiales y feriados" description="Marcá días con horario diferente o días de cierre">
        <div className="flex flex-col gap-3 mb-4">
          {especiales.length === 0 ? <p className="text-sm text-muted">No hay excepciones configuradas.</p>
          : especiales.map(e => (
            <div key={e.id} className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-white font-medium">
                    {new Date(e.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <Tag color={e.tipo === 'cerrado' ? 'red' : 'yellow'}>{e.tipo === 'cerrado' ? 'Cerrado' : 'Horario especial'}</Tag>
                </div>
                {e.motivo && <p className="text-xs text-muted mt-0.5">{e.motivo}</p>}
                {e.tipo === 'horario_especial' && <p className="text-xs text-muted">{e.hora_inicio} — {e.hora_fin}</p>}
              </div>
              <button onClick={() => eliminarEspecial(e.id)} className="text-xs text-accent2 hover:underline ml-4">Quitar</button>
            </div>
          ))}
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
          <p className="text-xs font-mono text-muted">Agregar excepción</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha" type="date" value={nuevaFecha.fecha} onChange={e => setNuevaFecha(f => ({ ...f, fecha: e.target.value }))} />
            <div>
              <label className="block text-sm text-muted mb-1.5">Tipo</label>
              <div className="flex gap-2">
                {['cerrado', 'horario_especial'].map(t => (
                  <button key={t} type="button" onClick={() => setNuevaFecha(f => ({ ...f, tipo: t }))}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs border transition-all ${nuevaFecha.tipo === t ? 'border-accent text-white bg-accent bg-opacity-10' : 'border-border text-muted'}`}>
                    {t === 'cerrado' ? 'Cerrado' : 'Especial'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {nuevaFecha.tipo === 'horario_especial' && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Apertura" type="time" value={nuevaFecha.hora_inicio} onChange={e => setNuevaFecha(f => ({ ...f, hora_inicio: e.target.value }))} />
              <Input label="Cierre" type="time" value={nuevaFecha.hora_fin} onChange={e => setNuevaFecha(f => ({ ...f, hora_fin: e.target.value }))} />
            </div>
          )}
          <Input label="Motivo (opcional)" value={nuevaFecha.motivo} placeholder="Ej: Feriado nacional..." onChange={e => setNuevaFecha(f => ({ ...f, motivo: e.target.value }))} />
          <Button onClick={agregarEspecial} disabled={!nuevaFecha.fecha} className="w-full">Agregar excepción</Button>
        </div>
      </Section>
    </div>
  )
}

function TabPagos({ negocio, setNegocio }) {
  const [mpToken, setMpToken] = useState(negocio?.mp_access_token ? '••••••••••••••••' : '')
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const tieneToken = negocio?.mp_access_token

  async function guardar(e) {
    e.preventDefault(); setSaving(true)
    const updates = {}
    if (mpToken && !mpToken.includes('•')) updates.mp_access_token = mpToken.trim()
    await supabase.from('negocios').update(updates).eq('id', negocio.id)
    setNegocio(n => ({ ...n, ...updates })); setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function quitarToken() {
    if (!confirm('¿Desconectás MercadoPago?')) return
    await supabase.from('negocios').update({ mp_access_token: null }).eq('id', negocio.id)
    setMpToken(''); setNegocio(n => ({ ...n, mp_access_token: null }))
  }

  return (
    <form onSubmit={guardar}>
      <Section title="MercadoPago" description="Conectá tu cuenta para recibir pagos de turnos">
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-5 ${tieneToken ? 'bg-accent3 bg-opacity-5 border-accent3 border-opacity-20' : 'bg-surface border-border'}`}>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tieneToken ? 'bg-accent3' : 'bg-muted'}`} />
          <div className="flex-1">
            <p className="text-sm text-white">{tieneToken ? 'Cuenta conectada' : 'Sin conectar'}</p>
            <p className="text-xs text-muted">{tieneToken ? 'Los pagos se acreditan en tu cuenta de MP' : 'Pegá tu Access Token para activar el cobro'}</p>
          </div>
          {tieneToken && <button type="button" onClick={quitarToken} className="text-xs text-accent2 hover:underline">Desconectar</button>}
        </div>
        <div className="flex flex-col gap-3">
          <div className="relative">
            <input type={showToken ? 'text' : 'password'} value={mpToken}
              onChange={e => setMpToken(e.target.value)} onFocus={() => { if (mpToken.includes('•')) setMpToken('') }}
              placeholder="APP_USR-..."
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 pr-12 text-sm text-white placeholder-muted outline-none focus:border-accent font-mono" />
            <button type="button" onClick={() => setShowToken(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-white">
              {showToken ? 'ocultar' : 'ver'}
            </button>
          </div>
          <div className="bg-surface border border-border rounded-xl px-4 py-3 text-xs text-muted space-y-1">
            <p className="text-white font-medium mb-2">¿Cómo obtengo mi Access Token?</p>
            <p>1. Entrá a <span className="text-accent">mercadopago.com.ar/developers</span></p>
            <p>2. Creá una aplicación</p>
            <p>3. Copiá el <strong className="text-white">Access Token de producción</strong></p>
            <p className="pt-1 text-yellow-400">⚠️ Nunca compartas este token con nadie</p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-5">
          <Button type="submit" disabled={saving} className="flex-1">{saving ? <Spinner size="sm" /> : 'Guardar'}</Button>
          {saved && <span className="text-sm text-accent3 font-mono">✓ Guardado</span>}
        </div>
      </Section>
    </form>
  )
}

function TabApariencia({ negocio, setNegocio }) {
  const COLORES_PRIMARIOS = [
    { nombre: 'Violeta', valor: '#7c6aff' },
    { nombre: 'Azul', valor: '#3b82f6' },
    { nombre: 'Verde', valor: '#22c55e' },
    { nombre: 'Rojo', valor: '#ef4444' },
    { nombre: 'Naranja', valor: '#f97316' },
    { nombre: 'Rosa', valor: '#ec4899' },
    { nombre: 'Amarillo', valor: '#eab308' },
    { nombre: 'Cyan', valor: '#06b6d4' },
  ]

  const FONDOS = [
    { nombre: 'Oscuro', valor: '#0a0a0f' },
    { nombre: 'Gris oscuro', valor: '#111827' },
    { nombre: 'Azul oscuro', valor: '#0f172a' },
    { nombre: 'Claro', valor: '#f9fafb' },
    { nombre: 'Blanco', valor: '#ffffff' },
  ]

  const [form, setForm] = useState({
    color_primario: negocio?.color_primario || '#7c6aff',
    color_fondo:    negocio?.color_fondo    || '#0a0a0f',
    logo_url:       negocio?.logo_url       || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  async function guardar(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const updates = {
      color_primario: form.color_primario,
      color_fondo:    form.color_fondo,
      logo_url:       form.logo_url || null,
    }

    const { data, error } = await supabase.functions.invoke('guardar-apariencia', {
      body: {
        negocio_id: negocio.id,
        ...updates,
      },
    })

    if (error) {
      setError(await getFunctionErrorMessage(error))
      setSaving(false)
      return
    }

    if (!data?.negocio) {
      setError('No pudimos confirmar que la apariencia haya quedado guardada.')
      setSaving(false)
      return
    }

    applyBusinessTheme(updates)

    setNegocio(n => ({ ...n, ...data.negocio }))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const fondoOscuro = ['#0a0a0f','#111827','#0f172a'].includes(form.color_fondo)

  return (
    <form onSubmit={guardar}>
      <Section title="Apariencia" description="Personalizá los colores de tu agenda pública">
        <div className="rounded-xl overflow-hidden border border-border mb-8" style={{ background: form.color_fondo }}>
          <div className="px-5 py-4 flex items-center gap-3 border-b" style={{ borderColor: fondoOscuro ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
            {form.logo_url
              ? <img src={form.logo_url} alt="logo" className="w-10 h-10 rounded-xl object-cover" />
              : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: form.color_primario + '33' }}>🏢</div>
            }
            <div>
              <p className="font-medium text-sm" style={{ color: fondoOscuro ? 'white' : '#111' }}>{negocio?.nombre}</p>
              <p className="text-xs capitalize" style={{ color: fondoOscuro ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{negocio?.tipo}</p>
            </div>
          </div>
          <div className="px-5 py-5">
            <div className="rounded-lg py-3 px-4 text-center text-sm font-medium text-white" style={{ background: form.color_primario }}>
              Reservar turno
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div>
            <label className="block text-sm text-white font-medium mb-3">Color de marca</label>
            <div className="flex flex-wrap gap-3">
              {COLORES_PRIMARIOS.map(c => (
                <button key={c.valor} type="button" onClick={() => setForm(f => ({ ...f, color_primario: c.valor }))}
                  title={c.nombre}
                  className={`w-10 h-10 rounded-xl transition-all ${form.color_primario === c.valor ? 'ring-2 ring-white ring-offset-2 ring-offset-bg scale-110' : 'hover:scale-105'}`}
                  style={{ background: c.valor }} />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-white font-medium mb-3">Fondo</label>
            <div className="flex flex-wrap gap-3">
              {FONDOS.map(c => (
                <button key={c.valor} type="button" onClick={() => setForm(f => ({ ...f, color_fondo: c.valor }))}
                  title={c.nombre}
                  className={`w-10 h-10 rounded-xl border border-border transition-all ${form.color_fondo === c.valor ? 'ring-2 ring-white ring-offset-2 ring-offset-bg scale-110' : 'hover:scale-105'}`}
                  style={{ background: c.valor }} />
              ))}
            </div>
          </div>
          <Input label="Logo (URL de imagen, opcional)" value={form.logo_url}
            onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
            placeholder="https://mi-logo.com/logo.png" />
          <p className="text-xs text-muted -mt-3">
            Podés subir tu imagen en <span className="text-accent">imgur.com</span> y pegar el link acá.
          </p>
        </div>
        {error && (
          <div className="bg-accent2 bg-opacity-10 border border-accent2 border-opacity-30 rounded-xl px-4 py-3 mt-6">
            <p className="text-sm text-accent2">{error}</p>
          </div>
        )}
        <div className="flex items-center gap-4 mt-6">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? <Spinner size="sm" /> : 'Guardar apariencia'}
          </Button>
          {saved && <span className="text-sm text-accent3 font-mono">✓ Guardado</span>}
        </div>
      </Section>
    </form>
  )
}
