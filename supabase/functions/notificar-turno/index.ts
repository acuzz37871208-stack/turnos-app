// supabase/functions/notificar-turno/index.ts
// Deploy: supabase functions deploy notificar-turno
// Requiere variable de entorno: RESEND_API_KEY (gratis en resend.com)
// Opcional: RESEND_FROM_EMAIL="Turnos App <turnos@tudominio.com>"

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

function row(label: string, value: string) {
  if (!value) return ''
  return `
    <tr>
      <td style="padding: 10px 0; color: #64748b; font-size: 14px;">${label}</td>
      <td style="padding: 10px 0; text-align: right; font-size: 14px; font-weight: 600; color: #0f172a;">${value}</td>
    </tr>
  `
}

function badge(label: string, color: string) {
  return `
    <span style="display: inline-block; border-radius: 999px; background: ${color}1A; color: ${color}; border: 1px solid ${color}40; padding: 6px 10px; font-size: 12px; font-weight: 700;">
      ${label}
    </span>
  `
}

function baseEmail({ title, preview, badgeHtml, children }: { title: string; preview: string; badgeHtml?: string; children: string }) {
  return `
    <div style="margin: 0; padding: 0; background: #f4f6fb;">
      <div style="display: none; max-height: 0; overflow: hidden;">${preview}</div>
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px 16px;">
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden;">
          <div style="padding: 24px 24px 12px;">
            <p style="margin: 0 0 12px; color: #7c6aff; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">Turnos App</p>
            ${badgeHtml ? `<div style="margin-bottom: 14px;">${badgeHtml}</div>` : ''}
            <h1 style="margin: 0; color: #0f172a; font-size: 24px; line-height: 1.25;">${title}</h1>
          </div>
          <div style="padding: 0 24px 24px;">
            ${children}
          </div>
        </div>
        <p style="margin: 16px 0 0; color: #94a3b8; font-size: 12px; text-align: center;">
          Este email fue enviado automáticamente por Turnos App.
        </p>
      </div>
    </div>
  `
}

async function sendEmail(resendKey: string, payload: Record<string, unknown>, idempotencyKey?: string) {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${resendKey}`,
    'Content-Type': 'application/json',
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    console.error('Resend error:', response.status, detail)
  }

  return response.ok
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
      .select('*, servicios(nombre, precio), profesionales(nombre), negocios(nombre, telefono, owner_id, slug)')
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
    const emailFrom = Deno.env.get('RESEND_FROM_EMAIL') || 'Turnos App <onboarding@resend.dev>'

    if (!resendKey) {
      console.log('RESEND_API_KEY no configurada — notificaciones desactivadas')
      return new Response('ok', { headers: corsHeaders })
    }

    const fechaFormateada = new Date(turno.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
    const appUrl = (Deno.env.get('APP_URL') || Deno.env.get('PUBLIC_SITE_URL') || '').replace(/\/$/, '')
    const clienteNombre = escapeHtml(turno.cliente_nombre)
    const negocioNombre = escapeHtml(negocio?.nombre)
    const servicioNombre = escapeHtml((turno.servicios as any)?.nombre)
    const profesionalNombre = escapeHtml((turno.profesionales as any)?.nombre)
    const nota = escapeHtml(turno.nota)
    const telefonoCliente = escapeHtml(turno.cliente_telefono)
    const emailCliente = escapeHtml(turno.cliente_email)
    const precio = Number((turno.servicios as any)?.precio || 0)
    const precioLabel = precio > 0 ? `$${precio.toLocaleString('es-AR')}` : ''
    const turnoCode = escapeHtml(turno_id.slice(0, 8).toUpperCase())
    const horaLabel = escapeHtml(`${turno.hora_inicio?.slice(0, 5) || turno.hora_inicio} hs`)
    const manageUrl = appUrl && negocio?.slug
      ? `${appUrl}/${encodeURIComponent(negocio.slug)}/mis-turnos?tel=${encodeURIComponent(turno.cliente_telefono)}&email=${encodeURIComponent(turno.cliente_email)}`
      : ''
    const adminUrl = appUrl ? `${appUrl}/admin` : ''
    const isPendingPayment = turno.estado === 'pendiente_pago'
    const isConfirmed = turno.estado === 'confirmado'
    const isCancelled = turno.estado === 'cancelado'
    const clientStatus = isPendingPayment
      ? { label: 'Pago pendiente', color: '#2563eb', title: 'Tu horario quedó reservado', intro: 'Completá el pago para dejar el turno confirmado.' }
      : isConfirmed
        ? { label: 'Confirmado', color: '#16a34a', title: 'Turno confirmado', intro: 'Tu turno quedó confirmado correctamente.' }
        : isCancelled
          ? { label: 'Cancelado', color: '#dc2626', title: 'Turno cancelado', intro: 'Tu turno fue cancelado.' }
          : { label: 'Solicitud recibida', color: '#ca8a04', title: 'Recibimos tu turno', intro: 'El negocio ya recibió tu solicitud de reserva.' }
    const ownerStatus = isPendingPayment
      ? { label: 'Pago pendiente', color: '#2563eb', title: 'Nuevo turno pendiente de pago', intro: 'El horario quedó bloqueado mientras el cliente completa el pago.' }
      : isConfirmed
        ? { label: 'Confirmado', color: '#16a34a', title: 'Nuevo turno confirmado', intro: 'Tenés un nuevo turno confirmado en tu agenda.' }
        : isCancelled
          ? { label: 'Cancelado', color: '#dc2626', title: 'Turno cancelado', intro: 'Este turno quedó cancelado en tu agenda.' }
          : { label: 'Pendiente', color: '#ca8a04', title: 'Nuevo turno recibido', intro: 'Tenés una nueva solicitud de turno para gestionar.' }

    const detailsTable = `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin: 22px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          ${row('Negocio', negocioNombre)}
          ${row('Servicio', servicioNombre)}
          ${turno.profesionales ? row('Profesional', profesionalNombre) : ''}
          ${row('Fecha', escapeHtml(fechaFormateada))}
          ${row('Hora', horaLabel)}
          ${precioLabel ? row('Precio', escapeHtml(precioLabel)) : ''}
        </table>
      </div>
    `

    // Email al cliente
    if (turno.cliente_email) {
      await sendEmail(resendKey, {
        from: emailFrom,
        to: turno.cliente_email,
        reply_to: ownerEmail || undefined,
        subject: `${clientStatus.title} - ${negocio?.nombre}`,
        html: baseEmail({
          title: clientStatus.title,
          preview: `${clientStatus.intro} ${fechaFormateada} a las ${horaLabel}.`,
          badgeHtml: badge(clientStatus.label, clientStatus.color),
          children: `
            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">
              Hola ${clienteNombre}, ${clientStatus.intro}
            </p>
            ${detailsTable}
            ${isPendingPayment ? `<p style="color: #475569; font-size: 14px; line-height: 1.6;">El horario queda reservado temporalmente. Si el pago no se completa, puede liberarse automáticamente.</p>` : ''}
            ${isCancelled ? `<p style="color: #475569; font-size: 14px; line-height: 1.6;">Ya no figura como turno activo. Si necesitás otro horario, podés volver a reservar desde la agenda.</p>` : ''}
            <div style="margin-top: 20px;">
              ${manageUrl ? `<a href="${escapeHtml(manageUrl)}" style="display: inline-block; background: #7c6aff; color: #ffffff; text-decoration: none; border-radius: 10px; padding: 12px 16px; font-size: 14px; font-weight: 700;">Consultar mi reserva</a>` : ''}
            </div>
            <p style="color: #64748b; font-size: 13px; margin-top: 22px;">
              Código de reserva: <span style="font-family: monospace; color: #0f172a;">${turnoCode}</span>
            </p>
            ${negocio?.telefono ? `<p style="color: #64748b; font-size: 13px;">Contacto del negocio: ${escapeHtml(negocio.telefono)}</p>` : ''}
          `,
        }),
        text: `${clientStatus.title}\n${clientStatus.intro}\n${negocio?.nombre} - ${fechaFormateada} ${horaLabel}\nServicio: ${(turno.servicios as any)?.nombre}\nCodigo: ${turnoCode}`,
      }, `client-${turno_id}-${turno.estado}`)
    }

    // Email al dueño del negocio
    if (ownerEmail) {
      await sendEmail(resendKey, {
        from: emailFrom,
        to: ownerEmail,
        reply_to: turno.cliente_email || undefined,
        subject: `${ownerStatus.title} - ${turno.cliente_nombre}`,
        html: baseEmail({
          title: ownerStatus.title,
          preview: `${clienteNombre} reservó ${servicioNombre} para ${fechaFormateada} a las ${horaLabel}.`,
          badgeHtml: badge(ownerStatus.label, ownerStatus.color),
          children: `
            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">
              ${ownerStatus.intro}
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin: 22px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                ${row('Cliente', clienteNombre)}
                ${row('Teléfono', telefonoCliente)}
                ${row('Email', emailCliente)}
                ${row('Servicio', servicioNombre)}
                ${turno.profesionales ? row('Profesional', profesionalNombre) : ''}
                ${row('Fecha', escapeHtml(fechaFormateada))}
                ${row('Hora', horaLabel)}
                ${precioLabel ? row('Precio', escapeHtml(precioLabel)) : ''}
                ${turno.nota ? row('Nota', `"${nota}"`) : ''}
              </table>
            </div>
            ${adminUrl ? `<a href="${escapeHtml(adminUrl)}" style="display: inline-block; background: #7c6aff; color: #ffffff; text-decoration: none; border-radius: 10px; padding: 12px 16px; font-size: 14px; font-weight: 700;">Abrir panel</a>` : ''}
            <p style="color: #64748b; font-size: 13px; margin-top: 22px;">
              Código de reserva: <span style="font-family: monospace; color: #0f172a;">${turnoCode}</span>
            </p>
          `,
        }),
        text: `${ownerStatus.title}\nCliente: ${turno.cliente_nombre}\nTelefono: ${turno.cliente_telefono}\nServicio: ${(turno.servicios as any)?.nombre}\nFecha: ${fechaFormateada} ${horaLabel}`,
      }, `owner-${turno_id}-${turno.estado}`)
    }

    return new Response('ok', { headers: corsHeaders })

  } catch (err) {
    console.error(err)
    return new Response('error', { status: 500 })
  }
})
