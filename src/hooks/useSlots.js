import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useSlots(negocioId, profesionalId, servicioId, fecha) {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!negocioId || !profesionalId || !servicioId || !fecha) return

    async function fetchSlots() {
      setLoading(true)
      try {
        const diaSemana = new Date(fecha + 'T12:00:00').getDay()

        // Horario del profesional ese día
        const { data: horario } = await supabase
          .from('horarios')
          .select('*')
          .eq('profesional_id', profesionalId)
          .eq('dia_semana', diaSemana)
          .single()

        if (!horario) { setSlots([]); return }

        // Turnos ya reservados ese día para ese profesional
        const { data: turnosOcupados } = await supabase
          .from('turnos')
          .select('hora_inicio, hora_fin')
          .eq('profesional_id', profesionalId)
          .eq('fecha', fecha)
          .in('estado', ['pendiente', 'confirmado'])

        // Duración del servicio
        const { data: servicio } = await supabase
          .from('servicios')
          .select('duracion_min')
          .eq('id', servicioId)
          .single()

        const duracion = servicio?.duracion_min || 30
        const ocupados = turnosOcupados || []

        // Generar slots
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

    // Si es hoy, no mostrar slots pasados
    if (esHoy) {
      const slotDate = new Date(`${fecha}T${slotInicio}`)
      if (slotDate <= ahora) { current += duracionMin; continue }
    }

    const ocupado = ocupados.some(t => {
      const tI = horaAMinutos(t.hora_inicio)
      const tF = horaAMinutos(t.hora_fin)
      return current < tF && (current + duracionMin) > tI
    })

    slots.push({ hora: slotInicio, horaFin: slotFin, disponible: !ocupado })
    current += duracionMin
  }

  return slots
}

const minutosAHora = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`
const horaAMinutos = (h) => { const [hh,mm] = h.split(':').map(Number); return hh*60+mm }
