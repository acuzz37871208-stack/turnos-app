import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { Badge, Spinner, Button } from '../../components/ui'

function MetricCard({ label, value, color }) {
  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-5 flex flex-col gap-1">
      <span className="text-xs font-mono text-muted uppercase tracking-widest">{label}</span>
      <span className={`text-3xl font-mono font-bold ${color}`}>{value}</span>
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [negocio, setNegocio] = useState(null)
  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split('T')[0])
  const [filtroEstado, setFiltroEstado] = useState('todos')

  const fetchTurnos = useCallback(async (negocioId, fecha) => {
    setLoading(true)
    const { data } = await supabase
      .from('turnos')
      .select('*, servicios(nombre), profesionales(nombre)')
      .eq('negocio_id', negocioId)
      .eq('fecha', fecha)
      .order('estado')
      .order('hora_inicio')
    setTurnos(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/admin/login'); return }

      const { data: neg } = await supabase
        .from('negocios')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      setNegocio(neg)
      if (neg) {
        fetchTurnos(neg.id, filtroFecha)
        document.body.style.backgroundColor = neg.color_fondo || '#0a0a0f'
        document.documentElement.style.setProperty('--color-bg', neg.color_fondo || '#0a0a0f')
        document.documentElement.style.setProperty('--color-accent', neg.color_primario || '#7c6aff')
      }
    }
    init()
  }, [fetchTurnos, filtroFecha, navigate])

  async function cambiarEstado(id, estado) {
    await supabase.from('turnos').update({ estado }).eq('id', id)
    if (negocio) fetchTurnos(negocio.id, filtroFecha)
  }

  function handleFecha(e) {
    setFiltroFecha(e.target.value)
    if (negocio) fetchTurnos(negocio.id, e.target.value)
  }

  const turnosFiltrados = filtroEstado === 'todos'
    ? turnos
    : turnos.filter(t => t.estado === filtroEstado)

  const metrics = {
    total:         turnos.length,
    pendientePago: turnos.filter(t => t.estado === 'pendiente_pago').length,
    confirmado:    turnos.filter(t => t.estado === 'confirmado').length,
    atendido:      turnos.filter(t => t.estado === 'atendido').length,
    cancelado:     turnos.filter(t => t.estado === 'cancelado').length,
  }

  const filtrosEstado = [
    { value: 'todos', label: 'Todos' },
    { value: 'pendiente_pago', label: 'Pago pendiente' },
    { value: 'confirmado', label: 'Confirmado' },
    { value: 'atendido', label: 'Atendido' },
    { value: 'cancelado', label: 'Cancelado' },
  ]

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-white">{negocio?.nombre || 'Dashboard'}</h1>
          <p className="text-xs text-muted font-mono">Panel de administración</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigate('/admin/configuracion')} className="text-sm px-3 py-2">
            ⚙️ Config
          </Button>
          <Button variant="ghost" onClick={() => supabase.auth.signOut().then(() => navigate('/admin/login'))} className="text-sm px-3 py-2">
            Salir
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <MetricCard label="Total" value={metrics.total} color="text-white" />
          <MetricCard label="Pago pendiente" value={metrics.pendientePago} color="text-blue-300" />
          <MetricCard label="Confirmados" value={metrics.confirmado} color="text-accent" />
          <MetricCard label="Atendidos" value={metrics.atendido} color="text-accent3" />
          <MetricCard label="Cancelados" value={metrics.cancelado} color="text-accent2" />
        </div>

        {/* Filtros */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <input
            type="date"
            value={filtroFecha}
            onChange={handleFecha}
            className="bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-accent"
          />
          <button onClick={() => { const h = new Date().toISOString().split('T')[0]; setFiltroFecha(h); if(negocio) fetchTurnos(negocio.id, h) }}
            className="text-sm text-muted hover:text-white border border-border rounded-lg px-4 py-2.5 transition-colors">
            Hoy
          </button>
          {filtrosEstado.map(filtro => (
            <button key={filtro.value}
              onClick={() => setFiltroEstado(filtro.value)}
              className={`text-sm border rounded-lg px-4 py-2.5 transition-colors ${filtroEstado === filtro.value ? 'border-accent text-white' : 'border-border text-muted hover:text-white'}`}>
              {filtro.label}
            </button>
          ))}
        </div>

        {/* Lista de turnos */}
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : turnosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-muted text-sm">
            <p className="text-3xl mb-3">📋</p>
            <p>No hay turnos para este día</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
  {turnosFiltrados.map(t => (
    <div
      key={t.id}
      className={`bg-surface border border-border rounded-xl p-5 ${
        t.estado === 'pendiente_pago' ? 'ring-2 ring-blue-400/40' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium text-white">{t.cliente_nombre}</p>
          <p className="text-sm text-muted">{t.servicios?.nombre} · {t.hora_inicio}hs</p>
          {t.profesionales && <p className="text-xs text-muted">con {t.profesionales.nombre}</p>}
          {t.nota && <p className="text-xs text-muted italic mt-1">"{t.nota}"</p>}
          <p className="text-xs text-muted mt-1">{t.cliente_telefono} · {t.cliente_email}</p>
          {t.estado === 'pendiente_pago' && (
            <p className="text-xs text-blue-300 mt-2">
              Esperando confirmación de MercadoPago
            </p>
          )}
        </div>
        <Badge estado={t.estado} />
      </div>

      <div className="flex gap-2 mt-3 pt-3 border-t border-border">
        {['pendiente', 'confirmado'].includes(t.estado) && (
          <button
            onClick={() => cambiarEstado(t.id, 'atendido')}
            className="text-xs text-accent3 border border-accent3 border-opacity-30 bg-accent3 bg-opacity-10 px-3 py-1.5 rounded-lg hover:bg-opacity-20 transition"
          >
            ✓ Marcar atendido
          </button>
        )}

        {['pendiente', 'pendiente_pago', 'confirmado'].includes(t.estado) && (
          <button
            onClick={() => cambiarEstado(t.id, 'cancelado')}
            className="text-xs text-accent2 border border-accent2 border-opacity-30 bg-accent2 bg-opacity-10 px-3 py-1.5 rounded-lg hover:bg-opacity-20 transition"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  ))}
</div>
        )}
      </div>
    </div>
  )
}
