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
      titulo,
      precio,
      email,
      success_url,
      failure_url,
    } = await req.json()

    // Validación básica
    if (!turno_id || !negocio_id || !titulo || !precio) {
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

    // Crear preferencia en MercadoPago
    const preferencia = {
      items: [
        {
          id: turno_id,
          title: `${titulo} — ${negocio.nombre}`,
          quantity: 1,
          unit_price: Number(precio),
          currency_id: 'ARS',
        }
      ],
      payer: {
        email: email || undefined,
      },
      back_urls: {
        success: `${success_url}?turno_id=${turno_id}&status=approved`,
        failure: `${failure_url}?turno_id=${turno_id}&status=failure`,
        pending: `${success_url}?turno_id=${turno_id}&status=pending`,
      },
      auto_return: 'approved',
      external_reference: turno_id,
      // Expiración: 30 minutos para completar el pago
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
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

    // Guardar el preference_id en el turno
    await supabase
      .from('turnos')
      .update({ mp_preference_id: mpData.id })
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
