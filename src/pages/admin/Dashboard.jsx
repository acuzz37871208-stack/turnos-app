import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { Alert, Badge, Button, LoadingBlock } from '../../components/ui'
import { applyBusinessTheme } from '../../lib/theme'

function fechaLocalISO(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function sumarDias(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatearFecha(fecha) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function MetricCard({ label, value, color, hint }) {
  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-4 flex flex-col gap-1">
      <span className="text-xs font-mono text-muted uppercase tracking-widest">{label}</span>
      <span className={`text-3xl font-mono font-bold ${color}`}>{value}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  )
}

function estadoHelp(estado) {
  return {
    pendiente: 'Pendiente de confirmación manual',
    pendiente_pago: 'Esperando confirmación de MercadoPago',
    confirmado: 'Confirmado para atender',
    atendido: 'Turno cerrado',
    cancelado: 'Turno cancelado',
  }[estado]
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [negocio, setNegocio] = useState(null)
  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroFecha, setFiltroFecha] = useState(fechaLocalISO())
  const [filtroEstado, setFiltroEstado] = useState('todos')

  const fetchTurnos = useCallback(async (negocioId, fecha) => {
    setLoading(true)
    const { data } = await supabase
      .from('turnos')
      .select('*, servicios(nombre), profesionales(nombre)')
      .eq('negocio_id', negocioId)
      .eq('fecha', fecha)
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
        applyBusinessTheme(neg)
      }
    }
    init()
  }, [fetchTurnos, filtroFecha, navigate])

  async function cambiarEstado(id, estado) {
    await supabase.from('turnos').update({ estado }).eq('id', id)
    if (negocio) fetchTurnos(negocio.id, filtroFecha)
  }

  function irAFecha(fecha) {
    setFiltroFecha(fecha)
    if (negocio) fetchTurnos(negocio.id, fecha)
  }

  function handleFecha(e) {
    irAFecha(e.target.value)
  }

  const turnosFiltrados = filtroEstado === 'todos'
    ? turnos
    : turnos.filter(t => t.estado === filtroEstado)

  const pendientesOperacion = turnos.filter(t => ['pendiente', 'confirmado', 'pendiente_pago'].includes(t.estado))
  const siguienteTurno = turnos.find(t => ['pendiente', 'confirmado', 'pendiente_pago'].includes(t.estado))
  const publicUrl = negocio ? `${window.location.origin}/${negocio.slug}` : ''

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
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-semibold text-white">{negocio?.nombre || 'Dashboard'}</h1>
            <p className="text-xs text-muted font-mono">{negocio?.activo ? 'Agenda publicada' : 'Agenda en borrador'}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex">
            {negocio && (
              <Button variant="ghost" onClick={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')} className="text-sm px-3 py-2">
                Ver agenda
              </Button>
            )}
            <Button variant="ghost" onClick={() => navigate('/admin/configuracion')} className="text-sm px-3 py-2">
              Config
            </Button>
            <Button variant="ghost" onClick={() => supabase.auth.signOut().then(() => navigate('/admin/login'))} className="text-sm px-3 py-2">
              Salir
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        <section className="mb-6">
          <p className="text-xs font-mono text-muted uppercase tracking-widest mb-2">Agenda</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white capitalize">{formatearFecha(filtroFecha)}</h2>
              <p className="text-sm text-muted mt-1">
                {siguienteTurno
                  ? `Próximo: ${siguienteTurno.hora_inicio?.slice(0, 5)} · ${siguienteTurno.cliente_nombre}`
                  : 'Sin próximos turnos activos para este día'}
              </p>
            </div>
            <p className="text-xs text-muted">
              {pendientesOperacion.length} turno{pendientesOperacion.length !== 1 ? 's' : ''} por gestionar
            </p>
          </div>
        </section>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-5">
          <MetricCard label="Total" value={metrics.total} color="text-white" hint="del día" />
          <MetricCard label="Por cobrar" value={metrics.pendientePago} color="text-blue-300" hint="MP" />
          <MetricCard label="Confirmados" value={metrics.confirmado} color="text-accent" hint="activos" />
          <MetricCard label="Atendidos" value={metrics.atendido} color="text-accent3" hint="cerrados" />
          <MetricCard label="Cancelados" value={metrics.cancelado} color="text-accent2" hint="bajas" />
        </div>

        {metrics.pendientePago > 0 && (
          <Alert tone="info" className="mb-6">
            Hay {metrics.pendientePago} turno{metrics.pendientePago !== 1 ? 's' : ''} esperando confirmación de MercadoPago.
          </Alert>
        )}

        {/* Filtros */}
        <div className="grid grid-cols-2 gap-3 mb-6 sm:flex sm:flex-wrap">
          <input
            type="date"
            value={filtroFecha}
            onChange={handleFecha}
            className="col-span-2 bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-accent sm:col-span-1"
          />
          <button onClick={() => irAFecha(fechaLocalISO())}
            className="text-sm text-muted hover:text-white border border-border rounded-lg px-4 py-2.5 transition-colors">
            Hoy
          </button>
          <button onClick={() => irAFecha(fechaLocalISO(sumarDias(new Date(), 1)))}
            className="text-sm text-muted hover:text-white border border-border rounded-lg px-4 py-2.5 transition-colors">
            Mañana
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
          <LoadingBlock title="Cargando turnos" description="Actualizando la agenda del día." />
        ) : turnosFiltrados.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl px-5 py-10 text-center">
            <p className="text-white font-medium">No hay turnos para mostrar</p>
            <p className="text-sm text-muted mt-2">
              {filtroEstado === 'todos'
                ? 'Este día todavía está libre.'
                : 'No hay turnos con este estado para la fecha elegida.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center mt-5">
              {negocio && (
                <Button type="button" variant="ghost" onClick={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')} className="text-sm px-3 py-2">
                  Ver agenda pública
                </Button>
              )}
              <Button type="button" onClick={() => navigate('/admin/configuracion')} className="text-sm px-3 py-2">
                Revisar configuración
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {turnosFiltrados.map(t => {
              const hora = t.hora_inicio?.slice(0, 5)
              return (
                <div
                  key={t.id}
                  className={`bg-surface border border-border rounded-xl p-5 ${
                    t.estado === 'pendiente_pago' ? 'ring-2 ring-blue-400/40' : ''
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="w-full flex-shrink-0 text-left border border-border rounded-lg px-3 py-2 sm:w-16 sm:text-center">
                      <p className="text-lg font-mono font-bold text-white">{hora}</p>
                      <p className="text-xs text-muted">hs</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-medium text-white">{t.cliente_nombre}</p>
                          <p className="text-sm text-muted mt-0.5">{t.servicios?.nombre || 'Servicio'}</p>
                          {t.profesionales && <p className="text-xs text-muted mt-0.5">con {t.profesionales.nombre}</p>}
                        </div>
                        <Badge estado={t.estado} />
                      </div>

                      <div className="mt-3 flex flex-col gap-1">
                        <p className="text-xs text-muted break-all">{t.cliente_telefono} · {t.cliente_email}</p>
                        {t.nota && <p className="text-xs text-muted italic">"{t.nota}"</p>}
                        {t.estado === 'pendiente_pago' && (
                          <p className="text-xs text-blue-300">
                            Esperando confirmación de MercadoPago
                          </p>
                        )}
                        {estadoHelp(t.estado) && t.estado !== 'pendiente_pago' && (
                          <p className="text-xs text-muted">{estadoHelp(t.estado)}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-2 mt-4 pt-3 border-t border-border sm:flex sm:flex-wrap">
                        {t.cliente_telefono && (
                          <a
                            href={`tel:${t.cliente_telefono}`}
                            className="text-xs text-muted border border-border px-3 py-2 rounded-lg hover:text-white hover:border-muted transition text-center"
                          >
                            Llamar
                          </a>
                        )}
                        {t.cliente_email && (
                          <a
                            href={`mailto:${t.cliente_email}`}
                            className="text-xs text-muted border border-border px-3 py-2 rounded-lg hover:text-white hover:border-muted transition text-center"
                          >
                            Email
                          </a>
                        )}
                        {t.estado === 'pendiente' && (
                          <button
                            onClick={() => cambiarEstado(t.id, 'confirmado')}
                            className="text-xs text-accent border border-accent border-opacity-30 bg-accent bg-opacity-10 px-3 py-2 rounded-lg hover:bg-opacity-20 transition"
                          >
                            Confirmar
                          </button>
                        )}

                        {['pendiente', 'confirmado'].includes(t.estado) && (
                          <button
                            onClick={() => cambiarEstado(t.id, 'atendido')}
                            className="text-xs text-accent3 border border-accent3 border-opacity-30 bg-accent3 bg-opacity-10 px-3 py-2 rounded-lg hover:bg-opacity-20 transition"
                          >
                            Marcar atendido
                          </button>
                        )}

                        {['pendiente', 'pendiente_pago', 'confirmado'].includes(t.estado) && (
                          <button
                            onClick={() => cambiarEstado(t.id, 'cancelado')}
                            className="text-xs text-accent2 border border-accent2 border-opacity-30 bg-accent2 bg-opacity-10 px-3 py-2 rounded-lg hover:bg-opacity-20 transition"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
