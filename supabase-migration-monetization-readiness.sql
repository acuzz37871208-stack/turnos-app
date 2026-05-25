-- Migración incremental para alinear la base existente con el frontend actual.
-- Ejecutar en Supabase SQL Editor sobre una base que ya tenga el schema inicial.

alter table negocios
  add column if not exists label_profesional text,
  add column if not exists color_primario text default '#7c6aff',
  add column if not exists color_fondo text default '#0a0a0f',
  add column if not exists mp_access_token text;

create table if not exists horarios_especiales (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid references negocios(id) on delete cascade,
  fecha       date not null,
  tipo        text not null check (tipo in ('cerrado','horario_especial')),
  hora_inicio time,
  hora_fin    time,
  motivo      text,
  created_at  timestamptz default now(),
  unique (negocio_id, fecha)
);

alter table horarios_especiales enable row level security;

create index if not exists horarios_especiales_negocio_fecha_idx
  on horarios_especiales (negocio_id, fecha);

create unique index if not exists turnos_unicos_activos
  on turnos (
    negocio_id,
    coalesce(profesional_id, '00000000-0000-0000-0000-000000000000'::uuid),
    fecha,
    hora_inicio
  )
  where estado in ('pendiente','pendiente_pago','confirmado');

drop policy if exists "negocios_public_read" on negocios;

drop policy if exists "negocios_owner_read" on negocios;
create policy "negocios_owner_read" on negocios
  for select using (auth.uid() = owner_id);

drop policy if exists "horarios_especiales_public_read" on horarios_especiales;
create policy "horarios_especiales_public_read" on horarios_especiales
  for select using (true);

drop policy if exists "horarios_especiales_owner_write" on horarios_especiales;
create policy "horarios_especiales_owner_write" on horarios_especiales
  for all using (
    negocio_id in (select id from negocios where owner_id = auth.uid())
  );

create or replace view negocios_public as
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
  from negocios;

create or replace view turnos_disponibilidad as
  select negocio_id, profesional_id, fecha, hora_inicio, hora_fin, estado
  from turnos
  where estado in ('pendiente','pendiente_pago','confirmado');
