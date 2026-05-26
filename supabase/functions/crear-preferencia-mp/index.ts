// supabase/functions/crear-preferencia-mp/index.ts
// Deploy: supabase functions deploy crear-preferencia-mp

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      turno_id,
      negocio_id,
      success_url,
      failure_url,
      notification_url,
    } = await req.json()

    // Validación básica
    if (!turno_id || !negocio_id) {
      return new Response(
        JSON.stringify({ error: 'Faltan parámetros requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Cliente Supabase con service role (para leer el token del negocio)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Obtener el Access Token de MercadoPago del negocio
    const { data: negocio, error: negErr } = await supabase
      .from('negocios')
      .select('mp_access_token, nombre')
      .eq('id', negocio_id)
      .single()

    if (negErr || !negocio) {
      return new Response(
        JSON.stringify({ error: 'Negocio no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!negocio.mp_access_token) {
      return new Response(
        JSON.stringify({ error: 'Este negocio no tiene MercadoPago configurado' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: turno, error: turnoErr } = await supabase
      .from('turnos')
      .select('id, negocio_id, cliente_email, estado, servicios(nombre, precio)')
      .eq('id', turno_id)
      .single()

    if (turnoErr || !turno || turno.negocio_id !== negocio_id) {
      return new Response(
        JSON.stringify({ error: 'Turno no encontrado para este negocio' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['pendiente_pago', 'pendiente'].includes(turno.estado)) {
      return new Response(
        JSON.stringify({ error: 'Este turno no está pendiente de pago' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const servicio = Array.isArray(turno.servicios) ? turno.servicios[0] : turno.servicios
    const precio = Number(servicio?.precio)

    if (!servicio?.nombre || !precio || precio <= 0) {
      return new Response(
        JSON.stringify({ error: 'El servicio no tiene un precio válido para cobrar' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const expirationDate = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    const webhookUrl = notification_url
      ? `${notification_url}?turno_id=${encodeURIComponent(turno_id)}`
      : undefined

    // Crear preferencia en MercadoPago
    const preferencia = {
      items: [
        {
          id: turno_id,
          title: `${servicio.nombre} — ${negocio.nombre}`,
          quantity: 1,
          unit_price: precio,
          currency_id: 'ARS',
        }
      ],
      payer: {
        email: turno.cliente_email || undefined,
      },
      back_urls: {
        success: `${success_url}?turno_id=${turno_id}&status=approved`,
        failure: `${failure_url}?turno_id=${turno_id}&status=failure`,
        pending: `${success_url}?turno_id=${turno_id}&status=pending`,
      },
      auto_return: 'approved',
      external_reference: turno_id,
      notification_url: webhookUrl,
      expires: true,
      expiration_date_to: expirationDate,
    }

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${negocio.mp_access_token}`,
      },
      body: JSON.stringify(preferencia),
    })

    if (!mpRes.ok) {
      const mpError = await mpRes.json()
      console.error('MP error:', mpError)
      return new Response(
        JSON.stringify({ error: 'Error al crear preferencia en MercadoPago', detail: mpError }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const mpData = await mpRes.json()

    // Guardar el preference_id y vencimiento en el turno
    await supabase
      .from('turnos')
      .update({
        mp_preference_id: mpData.id,
        mp_expires_at: expirationDate,
      })
      .eq('id', turno_id)

    return new Response(
      JSON.stringify({
        init_point: mpData.init_point,           // producción
        sandbox_init_point: mpData.sandbox_init_point, // testing
        preference_id: mpData.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
