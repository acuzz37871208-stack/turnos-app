// supabase/functions/notificar-turno/index.ts
// Deploy: supabase functions deploy notificar-turno
// Requiere variable de entorno: RESEND_API_KEY (gratis en resend.com)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { turno_id, negocio_id } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Obtener datos completos del turno
    const { data: turno } = await supabase
      .from('turnos')
      .select('*, servicios(nombre, precio), profesionales(nombre), negocios(nombre, telefono, owner_id)')
      .eq('id', turno_id)
      .single()

    if (!turno) return new Response('Turno no encontrado', { status: 404 })

    if (turno.negocio_id !== negocio_id) {
      return new Response('Turno no pertenece al negocio', { status: 403 })
    }

    const negocio = turno.negocios as any

    const { data: ownerData } = await supabase.auth.admin.getUserById(negocio?.owner_id)
    const ownerEmail = ownerData?.user?.email

    const resendKey = Deno.env.get('RESEND_API_KEY')

    if (!resendKey) {
      console.log('RESEND_API_KEY no configurada — notificaciones desactivadas')
      return new Response('ok', { headers: corsHeaders })
    }

    const fechaFormateada = new Date(turno.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
    const clienteNombre = escapeHtml(turno.cliente_nombre)
    const negocioNombre = escapeHtml(negocio?.nombre)
    const servicioNombre = escapeHtml((turno.servicios as any)?.nombre)
    const profesionalNombre = escapeHtml((turno.profesionales as any)?.nombre)
    const nota = escapeHtml(turno.nota)

    // Email al cliente
    if (turno.cliente_email) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Turnos App <noreply@turnos.app>',
          to: turno.cliente_email,
          subject: `Turno confirmado - ${negocio?.nombre}`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #111; margin-bottom: 4px;">¡Turno confirmado!</h2>
              <p style="color: #666; margin-bottom: 24px;">Hola ${clienteNombre}, tu turno quedó reservado.</p>
              
              <div style="background: #f9f9f9; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px 0; color: #888; font-size: 14px;">Negocio</td><td style="padding: 8px 0; text-align: right; font-size: 14px; font-weight: 500;">${negocioNombre}</td></tr>
                  <tr><td style="padding: 8px 0; color: #888; font-size: 14px;">Servicio</td><td style="padding: 8px 0; text-align: right; font-size: 14px; font-weight: 500;">${servicioNombre}</td></tr>
                  ${turno.profesionales ? `<tr><td style="padding: 8px 0; color: #888; font-size: 14px;">Profesional</td><td style="padding: 8px 0; text-align: right; font-size: 14px; font-weight: 500;">${profesionalNombre}</td></tr>` : ''}
                  <tr><td style="padding: 8px 0; color: #888; font-size: 14px;">Fecha</td><td style="padding: 8px 0; text-align: right; font-size: 14px; font-weight: 500;">${fechaFormateada}</td></tr>
                  <tr><td style="padding: 8px 0; color: #888; font-size: 14px;">Hora</td><td style="padding: 8px 0; text-align: right; font-size: 14px; font-weight: 500;">${turno.hora_inicio}hs</td></tr>
                  ${(turno.servicios as any)?.precio ? `<tr><td style="padding: 8px 0; color: #888; font-size: 14px;">Precio</td><td style="padding: 8px 0; text-align: right; font-size: 14px; font-weight: 500;">$${Number((turno.servicios as any).precio).toLocaleString('es-AR')}</td></tr>` : ''}
                </table>
              </div>

              <p style="color: #888; font-size: 13px;">
                N° de turno: <span style="font-family: monospace;">#${turno_id.slice(0,8).toUpperCase()}</span>
              </p>
              ${negocio?.telefono ? `<p style="color: #888; font-size: 13px;">Contacto: ${escapeHtml(negocio.telefono)}</p>` : ''}
            </div>
          `
        })
      })
    }

    // Email al dueño del negocio
    if (ownerEmail) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Turnos App <noreply@turnos.app>',
          to: ownerEmail,
          subject: `Nuevo turno - ${turno.cliente_nombre}`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #111; margin-bottom: 4px;">Nuevo turno reservado</h2>
              <p style="color: #666; margin-bottom: 24px;">Alguien reservó un turno en <strong>${negocioNombre}</strong>.</p>
              
              <div style="background: #f9f9f9; border-radius: 12px; padding: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px 0; color: #888; font-size: 14px;">Cliente</td><td style="padding: 8px 0; text-align: right; font-size: 14px; font-weight: 500;">${clienteNombre}</td></tr>
                  <tr><td style="padding: 8px 0; color: #888; font-size: 14px;">Teléfono</td><td style="padding: 8px 0; text-align: right; font-size: 14px; font-weight: 500;">${escapeHtml(turno.cliente_telefono)}</td></tr>
                  <tr><td style="padding: 8px 0; color: #888; font-size: 14px;">Servicio</td><td style="padding: 8px 0; text-align: right; font-size: 14px; font-weight: 500;">${servicioNombre}</td></tr>
                  ${turno.profesionales ? `<tr><td style="padding: 8px 0; color: #888; font-size: 14px;">Profesional</td><td style="padding: 8px 0; text-align: right; font-size: 14px; font-weight: 500;">${profesionalNombre}</td></tr>` : ''}
                  <tr><td style="padding: 8px 0; color: #888; font-size: 14px;">Fecha</td><td style="padding: 8px 0; text-align: right; font-size: 14px; font-weight: 500;">${fechaFormateada}</td></tr>
                  <tr><td style="padding: 8px 0; color: #888; font-size: 14px;">Hora</td><td style="padding: 8px 0; text-align: right; font-size: 14px; font-weight: 500;">${turno.hora_inicio}hs</td></tr>
                  ${turno.nota ? `<tr><td style="padding: 8px 0; color: #888; font-size: 14px;">Nota</td><td style="padding: 8px 0; text-align: right; font-size: 14px; font-style: italic;">"${nota}"</td></tr>` : ''}
                </table>
              </div>
            </div>
          `
        })
      })
    }

    return new Response('ok', { headers: corsHeaders })

  } catch (err) {
    console.error(err)
    return new Response('error', { status: 500 })
  }
})
