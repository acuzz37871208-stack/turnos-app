import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useNegocio(slug) {
  const [negocio, setNegocio] = useState(null)
  const [servicios, setServicios] = useState([])
  const [profesionales, setProfesionales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!slug) return

    async function fetchNegocio() {
      setLoading(true)
      try {
        const { data: neg, error: negErr } = await supabase
          .from('negocios')
          .select('*')
          .eq('slug', slug)
          .single()

        if (negErr) throw negErr

        const [{ data: svcs }, { data: profs }] = await Promise.all([
          supabase.from('servicios').select('*').eq('negocio_id', neg.id).eq('activo', true),
          supabase.from('profesionales').select('*').eq('negocio_id', neg.id).eq('activo', true),
        ])

        setNegocio(neg)
        setServicios(svcs || [])
        setProfesionales(profs || [])

        // Aplicar tema del negocio
        if (neg.color_primario) document.documentElement.style.setProperty('--color-accent', neg.color_primario)
        if (neg.color_fondo) document.documentElement.style.setProperty('--color-bg', neg.color_fondo)

      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchNegocio()

    // Limpiar tema al desmontar
    return () => {
      document.documentElement.style.removeProperty('--color-accent')
      document.documentElement.style.removeProperty('--color-bg')
    }
  }, [slug])

  return { negocio, servicios, profesionales, loading, error }
}