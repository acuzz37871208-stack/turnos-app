-- Ejecutar despues de crear las tablas principales.
-- Este bloque recrea vistas publicas y permisos de forma simple.

drop view if exists turnos_disponibilidad;
drop view if exists negocios_public;

create view negocios_public as
select
  id,
  nombre,
  tipo,
  slug,
  telefono,
  descripcion,
  logo_url,
  label_profesional,
  color_primario,
  color_fondo,
  activo,
  created_at
from public.negocios
where activo = true;

create view turnos_disponibilidad as
select
  negocio_id,
  profesional_id,
  fecha,
  hora_inicio,
  hora_fin,
  estado
from public.turnos
where estado in ('pendiente', 'confirmado')
   or (
     estado = 'pendiente_pago'
     and (mp_expires_at is null or mp_expires_at > now())
   );

grant usage on schema public to anon;
grant usage on schema public to authenticated;

grant select on public.negocios_public to anon;
grant select on public.negocios_public to authenticated;

grant select on public.turnos_disponibilidad to anon;
grant select on public.turnos_disponibilidad to authenticated;

grant select on public.servicios to anon;
grant select on public.profesionales to anon;
grant select on public.horarios to anon;
grant select on public.horarios_especiales to anon;

grant select on public.servicios to authenticated;
grant select on public.profesionales to authenticated;
grant select on public.horarios to authenticated;
grant select on public.horarios_especiales to authenticated;

grant insert on public.turnos to anon;
grant insert on public.turnos to authenticated;

grant select, insert, update, delete on public.negocios to authenticated;
grant select, insert, update, delete on public.servicios to authenticated;
grant select, insert, update, delete on public.profesionales to authenticated;
grant select, insert, update, delete on public.horarios to authenticated;
grant select, insert, update, delete on public.horarios_especiales to authenticated;
grant select, insert, update, delete on public.turnos to authenticated;
