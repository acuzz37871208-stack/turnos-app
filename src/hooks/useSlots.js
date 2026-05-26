import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useSlots(negocioId, profesionalId, servicioId, fecha) {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!negocioId || !servicioId || !fecha) return

    async function fetchSlots() {
      setLoading(true)

      try {
        await supabase.rpc('liberar_turnos_pago_vencido')

        // =========================
        // NORMALIZAR FECHA
        // =========================
        function normalizarFecha(f) {
          if (f.includes('/')) {
            const [d, m, y] = f.split('/')
            return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
          }
          return f
        }

        const fechaSQL = normalizarFecha(fecha)

        // =========================
        // DIA DE LA SEMANA
        // =========================
        const [year, month, day] = fechaSQL.split('-').map(Number)
        const diaSemana = new Date(year, month - 1, day).getDay()

        const profesionalIds = profesionalId
          ? [profesionalId]
          : await fetchProfesionalesDelNegocio(negocioId)

        if (profesionalIds.length === 0) {
          setSlots([])
          return
        }

        const { data: especial } = await supabase
          .from('horarios_especiales')
          .select('*')
          .eq('negocio_id', negocioId)
          .eq('fecha', fechaSQL)
          .maybeSingle()

        if (especial?.tipo === 'cerrado') {
          setSlots([])
          return
        }

        const horariosQuery = supabase
          .from('horarios')
          .select('*')
          .eq('dia_semana', diaSemana)
          .in('profesional_id', profesionalIds)

        const { data: horarios } = await horariosQuery
        const horario = especial?.tipo === 'horario_especial'
          ? especial
          : horarios?.[0]

        if (!horario) {
          setSlots([])
          return
        }

        let turnosQuery = supabase
          .from('turnos_disponibilidad')
          .select('hora_inicio, hora_fin')
          .eq('negocio_id', negocioId)
          .eq('fecha', fechaSQL)
          .in('estado', ['pendiente', 'pendiente_pago', 'confirmado'])
          .order('hora_inicio')

        if (profesionalId) {
          turnosQuery = turnosQuery.eq('profesional_id', profesionalId)
        }

        const { data: turnosOcupados } = await turnosQuery

        const { data: servicio } = await supabase
          .from('servicios')
          .select('duracion_min')
          .eq('id', servicioId)
          .single()

        const duracion = servicio?.duracion_min || 30

        const ocupados = (turnosOcupados || []).map(t => ({
          inicio: t.hora_inicio,
          fin: t.hora_fin
        }))

        // =========================
        // GENERAR SLOTS
        // =========================
        const generados = generarSlots(
          horario.hora_inicio,
          horario.hora_fin,
          duracion,
          ocupados,
          fechaSQL
        )

        setSlots(generados)

      } catch (err) {
        console.error(err)
        setSlots([])
      } finally {
        setLoading(false)
      }
    }

    fetchSlots()
  }, [negocioId, profesionalId, servicioId, fecha])

  return { slots, loading }
}

async function fetchProfesionalesDelNegocio(negocioId) {
  const { data } = await supabase
    .from('profesionales')
    .select('id')
    .eq('negocio_id', negocioId)
    .eq('activo', true)

  return (data || []).map((profesional) => profesional.id)
}

// =========================
// GENERADOR DE SLOTS
// =========================

function generarSlots(horaInicio, horaFin, duracionMin, ocupados, fecha) {
  const slots = []

  const [hI, mI] = horaInicio.split(':').map(Number)
  const [hF, mF] = horaFin.split(':').map(Number)

  let current = hI * 60 + mI
  const fin = hF * 60 + mF

  const ahora = new Date()
  const esHoy = fecha === ahora.toISOString().split('T')[0]

  while (current + duracionMin <= fin) {
    const slotInicio = minutosAHora(current)
    const slotFin = minutosAHora(current + duracionMin)

    if (esHoy) {
      const slotDate = new Date(`${fecha}T${slotInicio}`)
      if (slotDate <= ahora) {
        current += duracionMin
        continue
      }
    }

    const ocupado = ocupados.some(t => {
      const tI = horaAMinutos(t.inicio)
      const tF = horaAMinutos(t.fin)
      return current < tF && (current + duracionMin) > tI
    })

    slots.push({
      hora: slotInicio,
      horaFin: slotFin,
      disponible: !ocupado
    })

    current += duracionMin
  }

  return slots
}

const minutosAHora = (m) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

const horaAMinutos = (h) => {
  const [hh, mm] = h.split(':').map(Number)
  return hh * 60 + mm
}
