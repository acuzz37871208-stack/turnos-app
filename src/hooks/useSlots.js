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
        // 👉 1. calcular día correctamente
        let diaSemana

        if (fecha.includes('/')) {
          const [day, month, year] = fecha.split('/').map(Number)
          diaSemana = new Date(year, month - 1, day).getDay()
        } else {
          const [year, month, day] = fecha.split('-').map(Number)
          diaSemana = new Date(year, month - 1, day).getDay()
        }

        // 👉 2. traer horarios (SIN profesional)
        const { data: horarios } = await supabase
          .from('horarios')
          .select('*')
          .eq('dia_semana', diaSemana)

        const horario = horarios?.[0]

        if (!horario) {
          setSlots([])
          return
        }

        // 👉 3. turnos ocupados (SIN profesional)
        const { data: turnosOcupados } = await supabase
          .from('turnos')
          .select('hora_inicio, hora_fin')
          .eq('fecha', fecha)
          .in('estado', ['pendiente', 'confirmado'])
          .order('hora_inicio')

        // 👉 4. duración del servicio
        const { data: servicio } = await supabase
          .from('servicios')
          .select('duracion_min')
          .eq('id', servicioId)
          .single()

        const duracion = servicio?.duracion_min || 30

        // 👉 5. mapear ocupados
        const ocupados = (turnosOcupados || []).map(t => ({
          inicio: t.hora_inicio,
          fin: t.hora_fin
        }))

        // 👉 6. generar slots
        const generados = generarSlots(
          horario.hora_inicio,
          horario.hora_fin,
          duracion,
          ocupados,
          fecha
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


// =====================
// GENERADOR DE SLOTS
// =====================

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

    // evitar horarios pasados
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