// supabase/functions/mp-webhook/index.ts
// Deploy: supabase functions deploy mp-webhook
// Configurar en MP: https://www.mercadopago.com.ar/developers/panel/webhooks

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const body = await req.json()

    // MP envía notificaciones de tipo "payment"
    if (body.type !== 'payment') {
      return new Response('ok', { status: 200 })
    }

    const paymentId = body.data?.id
    if (!paymentId) return new Response('ok', { status: 200 })

    // Necesitamos el Access Token del negocio para consultar el pago.
    // Como el webhook no sabe de qué negocio es, usamos el turno via external_reference
    // Primero consultamos el pago con una clave genérica (si usás Marketplace de MP, podés usar el token del vendedor)

    // Estrategia: guardamos el negocio_id en el external_reference: "turno_id|negocio_id"
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Buscar el turno por mp_preference_id buscando el payment en MP
    // Usamos el token del negocio obtenido del turno
    // Para simplificar, buscamos el turno por payment id si ya fue guardado
    const { data: turno } = await supabase
      .from('turnos')
      .select('id, negocio_id, estado, negocios(mp_access_token)')
      .eq('mp_payment_id', String(paymentId))
      .maybeSingle()

    // Si no lo encontramos por payment_id, buscar via external_reference usando la API de MP
    // Esto requiere hacer un GET a MP para obtener el external_reference
    // Usamos SUPABASE_SERVICE_ROLE_KEY para consultar todos los negocios con token
    if (!turno) {
      // Intentar obtener el pago usando token hardcodeado de prueba
      // En producción deberías tener un token maestro de Marketplace
      console.log(`Payment ${paymentId} not found by id, skipping`)
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
