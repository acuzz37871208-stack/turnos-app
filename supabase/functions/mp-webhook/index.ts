// supabase/functions/mp-webhook/index.ts
// Deploy: supabase functions deploy mp-webhook
// Configurar en MP: https://www.mercadopago.com.ar/developers/panel/webhooks

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const turnoIdFromQuery = url.searchParams.get('turno_id')
    const body = await req.json().catch(() => ({}))

    // MercadoPago puede enviar "type" o "topic" según el origen de la notificación.
    const notificationType = body.type || body.topic || url.searchParams.get('topic')
    if (notificationType !== 'payment') {
      return new Response('ok', { status: 200 })
    }

    const paymentId = body.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id')
    if (!paymentId) return new Response('ok', { status: 200 })

    // Necesitamos el Access Token del negocio para consultar el pago.
    // Como el webhook no sabe de qué negocio es, usamos el turno via external_reference
    // Primero consultamos el pago con una clave genérica (si usás Marketplace de MP, podés usar el token del vendedor)

    // Estrategia: guardamos el negocio_id en el external_reference: "turno_id|negocio_id"
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let turnoQuery = supabase
      .from('turnos')
      .select('id, negocio_id, estado, negocios(mp_access_token)')

    if (turnoIdFromQuery) {
      turnoQuery = turnoQuery.eq('id', turnoIdFromQuery)
    } else {
      turnoQuery = turnoQuery.eq('mp_payment_id', String(paymentId))
    }

    const { data: turno } = await turnoQuery.maybeSingle()

    if (!turno) {
      console.log(`Turno not found for payment ${paymentId}`)
      return new Response('ok', { status: 200 })
    }

    const mpAccessToken = (turno.negocios as any)?.mp_access_token
    if (!mpAccessToken) return new Response('ok', { status: 200 })

    // Consultar el estado real del pago en MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${mpAccessToken}` }
    })

    if (!mpRes.ok) return new Response('ok', { status: 200 })

    const pago = await mpRes.json()
    const paymentExternalReference = pago.external_reference

    if (paymentExternalReference && paymentExternalReference !== turno.id) {
      console.log(`Payment ${paymentId} external_reference mismatch`)
      return new Response('ok', { status: 200 })
    }

    // Mapear estado de MP → estado del turno
    const estadoMap: Record<string, string> = {
      approved:   'confirmado',
      pending:    'pendiente_pago',
      in_process: 'pendiente_pago',
      rejected:   'cancelado',
      refunded:   'cancelado',
      cancelled:  'cancelado',
    }

    const nuevoEstado = estadoMap[pago.status]
    if (!nuevoEstado || turno.estado === nuevoEstado) {
      return new Response('ok', { status: 200 })
    }

    await supabase
      .from('turnos')
      .update({
        estado:         nuevoEstado,
        mp_payment_id:  String(paymentId),
      })
      .eq('id', turno.id)

    console.log(`Turno ${turno.id} → ${nuevoEstado} (pago ${paymentId})`)
    return new Response('ok', { status: 200 })

  } catch (err) {
    console.error(err)
    return new Response('error', { status: 500 })
  }
})
