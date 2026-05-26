alter table public.turnos
  add column if not exists mp_expires_at timestamptz;

create index if not exists turnos_mp_expires_at_idx
  on public.turnos (mp_expires_at)
  where estado = 'pendiente_pago';

create or replace function public.liberar_turnos_pago_vencido()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer;
begin
  update turnos
  set estado = 'cancelado'
  where estado = 'pendiente_pago'
    and mp_expires_at is not null
    and mp_expires_at < now();

  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

drop view if exists public.turnos_disponibilidad;

create view public.turnos_disponibilidad as
  select negocio_id, profesional_id, fecha, hora_inicio, hora_fin, estado
  from public.turnos
  where estado in ('pendiente', 'confirmado')
     or (
       estado = 'pendiente_pago'
       and (mp_expires_at is null or mp_expires_at > now())
     );

revoke all on function public.liberar_turnos_pago_vencido() from public;
grant execute on function public.liberar_turnos_pago_vencido() to anon;
grant execute on function public.liberar_turnos_pago_vencido() to authenticated;
grant select on public.turnos_disponibilidad to anon;
grant select on public.turnos_disponibilidad to authenticated;
