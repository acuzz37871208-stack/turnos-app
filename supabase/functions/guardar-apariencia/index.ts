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

function isHexColor(value: unknown) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
}

function normalizeLogoUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null

  try {
    const url = new URL(value.trim())
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()

    if (!token) {
      return jsonResponse({ error: 'Iniciá sesión nuevamente para guardar la apariencia.' }, 401)
    }

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: userData, error: userError } = await authClient.auth.getUser(token)

    if (userError || !userData.user) {
      return jsonResponse({ error: 'Sesión expirada. Iniciá sesión nuevamente.' }, 401)
    }

    const {
      negocio_id,
      color_primario,
      color_fondo,
      logo_url,
    } = await req.json()

    if (!negocio_id) {
      return jsonResponse({ error: 'No encontramos el negocio para guardar la apariencia.' }, 400)
    }

    if (!isHexColor(color_primario) || !isHexColor(color_fondo)) {
      return jsonResponse({ error: 'Los colores elegidos no tienen un formato válido.' }, 422)
    }

    const normalizedLogoUrl = normalizeLogoUrl(logo_url)
    if (logo_url && !normalizedLogoUrl) {
      return jsonResponse({ error: 'La URL del logo tiene que empezar con http:// o https://.' }, 422)
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data, error } = await adminClient
      .from('negocios')
      .update({
        color_primario,
        color_fondo,
        logo_url: normalizedLogoUrl,
      })
      .eq('id', negocio_id)
      .eq('owner_id', userData.user.id)
      .select('id, color_primario, color_fondo, logo_url')
      .single()

    if (error || !data) {
      return jsonResponse(
        { error: 'No pudimos guardar la apariencia. Verificá que este negocio pertenezca a tu cuenta.' },
        403,
      )
    }

    return jsonResponse({ negocio: data })
  } catch (error) {
    console.error(error)
    return jsonResponse({ error: 'Error interno al guardar la apariencia.' }, 500)
  }
})
