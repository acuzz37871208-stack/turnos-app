-- Refuerzo de privacidad para "Mis turnos".
-- Ejecutar en Supabase SQL Editor antes o junto al deploy del frontend.

create or replace function public.buscar_turnos_cliente(
  p_slug text,
  p_telefono text,
  p_email text
)
returns table (
  id uuid,
  fecha date,
  hora_inicio time,
  estado text,
  servicio_nombre text,
  profesional_nombre text
)
language sql
security definer
set search_path = public
as $$
  select
    t.id,
    t.fecha,
    t.hora_inicio,
    t.estado,
    s.nombre as servicio_nombre,
    p.nombre as profesional_nombre
  from turnos t
  join negocios n on n.id = t.negocio_id
  left join servicios s on s.id = t.servicio_id
  left join profesionales p on p.id = t.profesional_id
  where n.slug = p_slug
    and t.cliente_telefono = trim(p_telefono)
    and lower(t.cliente_email) = lower(trim(p_email))
  order by t.fecha desc, t.hora_inicio desc;
$$;

create or replace function public.cancelar_turno_cliente(
  p_turno_id uuid,
  p_slug text,
  p_telefono text,
  p_email text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer;
begin
  update turnos t
  set estado = 'cancelado'
  from negocios n
  where t.id = p_turno_id
    and n.id = t.negocio_id
    and n.slug = p_slug
    and t.cliente_telefono = trim(p_telefono)
    and lower(t.cliente_email) = lower(trim(p_email))
    and t.estado in ('pendiente', 'pendiente_pago', 'confirmado');

  get diagnostics affected_count = row_count;
  return affected_count > 0;
end;
$$;

revoke all on function public.buscar_turnos_cliente(text, text, text) from public;
revoke all on function public.cancelar_turno_cliente(uuid, text, text, text) from public;

grant execute on function public.buscar_turnos_cliente(text, text, text) to anon;
grant execute on function public.buscar_turnos_cliente(text, text, text) to authenticated;

grant execute on function public.cancelar_turno_cliente(uuid, text, text, text) to anon;
grant execute on function public.cancelar_turno_cliente(uuid, text, text, text) to authenticated;
