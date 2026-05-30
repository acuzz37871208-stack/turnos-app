// supabase/functions/crear-preferencia-mp/index.ts
// Deploy: supabase functions deploy crear-preferencia-mp

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(
    JSON.stringify(payload),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function mercadopagoErrorMessage(mpError: any) {
  const message = String(mpError?.message || '')
  const error = String(mpError?.error || '')
  const causes = Array.isArray(mpError?.cause)
    ? mpError.cause.map((cause: any) => String(cause?.description || cause?.code || '')).join(' ')
    : ''
  const text = `${message} ${error} ${causes}`.toLowerCase()

  if (text.includes('invalid') && text.includes('token')) {
    return 'MercadoPago rechazó el Access Token. Revisá la conexión de MercadoPago en Configuración.'
  }

  if (text.includes('unit_price') || text.includes('amount') || text.includes('price')) {
    return 'MercadoPago rechazó el monto del servicio. Revisá el precio configurado.'
  }

  return 'MercadoPago no pudo crear el link de pago. Revisá la configuración e intentá nuevamente.'
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
    } = await req.json()

    // Validación básica
    if (!turno_id || !negocio_id) {
      return jsonResponse({ error: 'Faltan parámetros requeridos' }, 400)
    }

    // Cliente Supabase con service role (para leer el token del negocio)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Obtener el Access Token de MercadoPago del negocio
    const { data: negocio, error: negErr } = await supabase
      .from('negocios')
      .select('mp_access_token, nombre, slug')
      .eq('id', negocio_id)
      .single()

    if (negErr || !negocio) {
      return jsonResponse({ error: 'Negocio no encontrado' }, 404)
    }

    if (!negocio.mp_access_token) {
      return jsonResponse(
        { error: 'Este negocio todavía no tiene MercadoPago configurado. Avisale al negocio para activar los pagos.' },
        422
      )
    }

    const { data: turno, error: turnoErr } = await supabase
      .from('turnos')
      .select('id, negocio_id, cliente_email, estado, servicios(nombre, precio)')
      .eq('id', turno_id)
      .single()

    if (turnoErr || !turno || turno.negocio_id !== negocio_id) {
      return jsonResponse({ error: 'Turno no encontrado para este negocio' }, 404)
    }

    if (!['pendiente_pago', 'pendiente'].includes(turno.estado)) {
      return jsonResponse({ error: 'Este turno ya no está pendiente de pago' }, 409)
    }

    const servicio = Array.isArray(turno.servicios) ? turno.servicios[0] : turno.servicios
    const precio = Number(servicio?.precio)

    if (!servicio?.nombre || !precio || precio <= 0) {
      return jsonResponse({ error: 'El servicio no tiene un precio válido para cobrar' }, 422)
    }

    const expirationDate = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    const appUrl = (Deno.env.get('APP_URL') || Deno.env.get('PUBLIC_SITE_URL') || '').replace(/\/$/, '')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '')

    if (!appUrl || !supabaseUrl) {
      return jsonResponse({ error: 'Falta configurar APP_URL o SUPABASE_URL para iniciar pagos.' }, 500)
    }

    const successUrl = `${appUrl}/${negocio.slug}/confirmacion`
    const failureUrl = `${appUrl}/${negocio.slug}/reservar`
    const webhookSecret = Deno.env.get('MP_WEBHOOK_QUERY_SECRET')
    const webhookUrl = new URL(`${supabaseUrl}/functions/v1/mp-webhook`)
    webhookUrl.searchParams.set('turno_id', turno_id)

    if (webhookSecret) {
      webhookUrl.searchParams.set('token', webhookSecret)
    }

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
        success: `${successUrl}?turno_id=${turno_id}&status=approved`,
        failure: `${failureUrl}?turno_id=${turno_id}&status=failure`,
        pending: `${successUrl}?turno_id=${turno_id}&status=pending`,
      },
      auto_return: 'approved',
      external_reference: turno_id,
      notification_url: webhookUrl.toString(),
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
      return jsonResponse(
        { error: mercadopagoErrorMessage(mpError), detail: mpError },
        502
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

    return jsonResponse({
        init_point: mpData.init_point,           // producción
        sandbox_init_point: mpData.sandbox_init_point, // testing
        preference_id: mpData.id,
      })

  } catch (err) {
    console.error(err)
    return jsonResponse({ error: 'Error interno al iniciar el pago. Intentá nuevamente.' }, 500)
  }
})
