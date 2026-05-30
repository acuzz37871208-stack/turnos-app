import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function horaAMinutos(hora: string) {
  const [hh, mm] = hora.split(':').map(Number)
  return hh * 60 + mm
}

function minutosAHora(minutos: number) {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
}

function isEmail(value: unknown) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function isPhone(value: unknown) {
  return typeof value === 'string' && value.replace(/\D/g, '').length >= 8
}

function isDate(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isTime(value: unknown) {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)
}

function nowInBuenosAires() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())

  const get = (type: string) => parts.find((part) => part.type === type)?.value || '00'

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      negocio_id,
      servicio_id,
      profesional_id,
      cliente_nombre,
      cliente_telefono,
      cliente_email,
      nota,
      fecha,
      hora_inicio,
    } = await req.json()

    if (!negocio_id || !servicio_id || !isDate(fecha) || !isTime(hora_inicio)) {
      return jsonResponse({ error: 'Faltan datos para crear el turno.' }, 400)
    }

    if (typeof cliente_nombre !== 'string' || cliente_nombre.trim().length < 2 || !isPhone(cliente_telefono) || !isEmail(cliente_email)) {
      return jsonResponse({ error: 'Revisá nombre, teléfono y email antes de confirmar.' }, 422)
    }

    const now = nowInBuenosAires()
    if (fecha < now.date || (fecha === now.date && hora_inicio <= now.time)) {
      return jsonResponse({ error: 'No se pueden reservar fechas pasadas.' }, 422)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: negocio } = await supabase
      .from('negocios')
      .select('id, tipo, activo')
      .eq('id', negocio_id)
      .eq('activo', true)
      .single()

    if (!negocio) {
      return jsonResponse({ error: 'La agenda no está disponible para recibir reservas.' }, 404)
    }

    const { data: servicio } = await supabase
      .from('servicios')
      .select('id, negocio_id, duracion_min, requiere_pago, activo')
      .eq('id', servicio_id)
      .eq('negocio_id', negocio_id)
      .eq('activo', true)
      .single()

    if (!servicio) {
      return jsonResponse({ error: 'El servicio elegido ya no está disponible.' }, 404)
    }

    const profesionalId = profesional_id && profesional_id !== 'cualquiera' ? profesional_id : null
    let profesionalIds: string[] = []

    if (negocio.tipo !== 'cancha' && !profesionalId) {
      return jsonResponse({ error: 'Elegí un recurso antes de confirmar el turno.' }, 422)
    }

    if (profesionalId) {
      const { data: profesional } = await supabase
        .from('profesionales')
        .select('id')
        .eq('id', profesionalId)
        .eq('negocio_id', negocio_id)
        .eq('activo', true)
        .single()

      if (!profesional) {
        return jsonResponse({ error: 'El recurso elegido ya no está disponible.' }, 404)
      }

      profesionalIds = [profesional.id]
    } else {
      const { data: profesionales } = await supabase
        .from('profesionales')
        .select('id')
        .eq('negocio_id', negocio_id)
        .eq('activo', true)

      profesionalIds = (profesionales || []).map((profesional) => profesional.id)
    }

    if (profesionalIds.length === 0) {
      return jsonResponse({ error: 'La agenda no tiene recursos activos para reservar.' }, 422)
    }

    const [year, month, day] = String(fecha).split('-').map(Number)
    const diaSemana = new Date(year, month - 1, day).getDay()

    const { data: especial } = await supabase
      .from('horarios_especiales')
      .select('*')
      .eq('negocio_id', negocio_id)
      .eq('fecha', fecha)
      .maybeSingle()

    if (especial?.tipo === 'cerrado') {
      return jsonResponse({ error: 'Ese día la agenda está cerrada.' }, 422)
    }

    let horario = especial?.tipo === 'horario_especial' ? especial : null

    if (!horario) {
      const { data: horarios } = await supabase
        .from('horarios')
        .select('*')
        .eq('dia_semana', diaSemana)
        .in('profesional_id', profesionalIds)

      horario = horarios?.[0]
    }

    if (!horario) {
      return jsonResponse({ error: 'No hay horarios disponibles para esa fecha.' }, 422)
    }

    const inicioMin = horaAMinutos(hora_inicio)
    const duracion = Number(servicio.duracion_min || 30)
    const finMin = inicioMin + duracion
    const hora_fin = minutosAHora(finMin)

    if (inicioMin < horaAMinutos(horario.hora_inicio) || finMin > horaAMinutos(horario.hora_fin)) {
      return jsonResponse({ error: 'Ese horario está fuera del horario de atención.' }, 422)
    }

    const { data: ocupados } = await supabase
      .from('turnos')
      .select('hora_inicio, hora_fin, profesional_id, estado, mp_expires_at')
      .eq('negocio_id', negocio_id)
      .eq('fecha', fecha)
      .in('estado', ['pendiente', 'pendiente_pago', 'confirmado'])

    const ahora = new Date()
    const solapa = (ocupados || []).some((turno) => {
      if (turno.estado === 'pendiente_pago' && turno.mp_expires_at && new Date(turno.mp_expires_at) < ahora) {
        return false
      }

      if (profesionalId && turno.profesional_id !== profesionalId) {
        return false
      }

      const turnoInicio = horaAMinutos(turno.hora_inicio)
      const turnoFin = horaAMinutos(turno.hora_fin)
      return inicioMin < turnoFin && finMin > turnoInicio
    })

    if (solapa) {
      return jsonResponse({ error: 'Ese horario acaba de ser reservado. Elegí otro horario.' }, 409)
    }

    const { data: turno, error: insertError } = await supabase
      .from('turnos')
      .insert({
        negocio_id,
        servicio_id,
        profesional_id: profesionalId,
        cliente_nombre: cliente_nombre.trim(),
        cliente_telefono: cliente_telefono.trim(),
        cliente_email: cliente_email.trim().toLowerCase(),
        nota: typeof nota === 'string' && nota.trim() ? nota.trim() : null,
        fecha,
        hora_inicio,
        hora_fin,
        estado: servicio.requiere_pago ? 'pendiente_pago' : 'pendiente',
      })
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return jsonResponse({ error: 'Ese horario acaba de ser reservado. Elegí otro horario.' }, 409)
      }

      throw insertError
    }

    return jsonResponse({ turno })
  } catch (error) {
    console.error(error)
    return jsonResponse({ error: 'No pudimos crear el turno. Intentá nuevamente.' }, 500)
  }
})
