-- Setup completo para Supabase — Turnos App
-- Usar este archivo si la base todavía no tiene las tablas creadas.

create extension if not exists "pgcrypto";

-- ── TABLAS ────────────────────────────────────

create table if not exists negocios (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid references auth.users(id) on delete cascade,
  nombre             text not null,
  tipo               text not null check (tipo in ('clinica','peluqueria','cancha','otro')),
  slug               text not null unique,
  telefono           text,
  descripcion        text,
  logo_url           text,
  label_profesional  text,
  color_primario     text default '#7c6aff',
  color_fondo        text default '#0a0a0f',
  mp_access_token    text,
  activo             boolean default true,
  created_at         timestamptz default now()
);

create table if not exists profesionales (
  id            uuid primary key default gen_random_uuid(),
  negocio_id    uuid references negocios(id) on delete cascade,
  nombre        text not null,
  especialidad  text,
  activo        boolean default true
);

create table if not exists horarios (
  id               uuid primary key default gen_random_uuid(),
  profesional_id   uuid references profesionales(id) on delete cascade,
  dia_semana       int not null check (dia_semana between 0 and 6),
  hora_inicio      time not null,
  hora_fin         time not null
);

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

create table if not exists servicios (
  id             uuid primary key default gen_random_uuid(),
  negocio_id     uuid references negocios(id) on delete cascade,
  nombre         text not null,
  descripcion    text,
  duracion_min   int not null default 30,
  precio         numeric(10,2),
  requiere_pago  boolean default false,
  activo         boolean default true
);

create table if not exists turnos (
  id                uuid primary key default gen_random_uuid(),
  negocio_id        uuid references negocios(id) on delete cascade,
  servicio_id       uuid references servicios(id),
  profesional_id    uuid references profesionales(id),
  cliente_nombre    text not null,
  cliente_telefono  text not null,
  cliente_email     text not null,
  nota              text,
  fecha             date not null,
  hora_inicio       time not null,
  hora_fin          time not null,
  estado            text not null default 'pendiente'
                    check (estado in ('pendiente','pendiente_pago','confirmado','atendido','cancelado')),
  mp_preference_id  text,
  mp_payment_id     text,
  created_at        timestamptz default now()
);

-- ── COLUMNAS PARA BASES PARCIALMENTE CREADAS ──

alter table negocios
  add column if not exists label_profesional text,
  add column if not exists color_primario text default '#7c6aff',
  add column if not exists color_fondo text default '#0a0a0f',
  add column if not exists mp_access_token text;

-- ── ÍNDICES ───────────────────────────────────

create index if not exists turnos_negocio_fecha_idx on turnos (negocio_id, fecha);
create index if not exists turnos_cliente_telefono_idx on turnos (cliente_telefono);
create index if not exists negocios_slug_idx on negocios (slug);
create index if not exists horarios_especiales_negocio_fecha_idx on horarios_especiales (negocio_id, fecha);

create unique index if not exists turnos_unicos_activos
  on turnos (
    negocio_id,
    coalesce(profesional_id, '00000000-0000-0000-0000-000000000000'::uuid),
    fecha,
    hora_inicio
  )
  where estado in ('pendiente','pendiente_pago','confirmado');

-- ── RLS ───────────────────────────────────────

alter table negocios enable row level security;
alter table profesionales enable row level security;
alter table horarios enable row level security;
alter table horarios_especiales enable row level security;
alter table servicios enable row level security;
alter table turnos enable row level security;

drop policy if exists "negocios_public_read" on negocios;
drop policy if exists "negocios_owner_read" on negocios;
drop policy if exists "negocios_owner_write" on negocios;
create policy "negocios_owner_read" on negocios
  for select using (auth.uid() = owner_id);
create policy "negocios_owner_write" on negocios
  for all using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "servicios_public_read" on servicios;
drop policy if exists "servicios_owner_write" on servicios;
create policy "servicios_public_read" on servicios
  for select using (true);
create policy "servicios_owner_write" on servicios
  for all using (negocio_id in (select id from negocios where owner_id = auth.uid()))
  with check (negocio_id in (select id from negocios where owner_id = auth.uid()));

drop policy if exists "profs_public_read" on profesionales;
drop policy if exists "profs_owner_write" on profesionales;
create policy "profs_public_read" on profesionales
  for select using (true);
create policy "profs_owner_write" on profesionales
  for all using (negocio_id in (select id from negocios where owner_id = auth.uid()))
  with check (negocio_id in (select id from negocios where owner_id = auth.uid()));

drop policy if exists "horarios_public_read" on horarios;
drop policy if exists "horarios_owner_write" on horarios;
create policy "horarios_public_read" on horarios
  for select using (true);
create policy "horarios_owner_write" on horarios
  for all using (
    profesional_id in (
      select p.id
      from profesionales p
      join negocios n on n.id = p.negocio_id
      where n.owner_id = auth.uid()
    )
  )
  with check (
    profesional_id in (
      select p.id
      from profesionales p
      join negocios n on n.id = p.negocio_id
      where n.owner_id = auth.uid()
    )
  );

drop policy if exists "horarios_especiales_public_read" on horarios_especiales;
drop policy if exists "horarios_especiales_owner_write" on horarios_especiales;
create policy "horarios_especiales_public_read" on horarios_especiales
  for select using (true);
create policy "horarios_especiales_owner_write" on horarios_especiales
  for all using (negocio_id in (select id from negocios where owner_id = auth.uid()))
  with check (negocio_id in (select id from negocios where owner_id = auth.uid()));

drop policy if exists "turnos_insert_public" on turnos;
drop policy if exists "turnos_owner_read" on turnos;
drop policy if exists "turnos_client_read" on turnos;
drop policy if exists "turnos_client_cancel" on turnos;
drop policy if exists "turnos_owner_update" on turnos;
create policy "turnos_insert_public" on turnos
  for insert with check (true);
create policy "turnos_owner_read" on turnos
  for select using (negocio_id in (select id from negocios where owner_id = auth.uid()));
create policy "turnos_client_read" on turnos
  for select using (
    cliente_telefono = current_setting('request.jwt.claims', true)::json->>'phone'
  );
create policy "turnos_client_cancel" on turnos
  for update using (cliente_telefono is not null)
  with check (estado = 'cancelado');
create policy "turnos_owner_update" on turnos
  for update using (negocio_id in (select id from negocios where owner_id = auth.uid()));

-- ── VISTAS PÚBLICAS SEGURAS ───────────────────

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
  from negocios
  where activo = true;

create or replace view turnos_disponibilidad as
  select negocio_id, profesional_id, fecha, hora_inicio, hora_fin, estado
  from turnos
  where estado in ('pendiente','pendiente_pago','confirmado');

grant usage on schema public to anon, authenticated;
grant select on negocios_public to anon, authenticated;
grant select on turnos_disponibilidad to anon, authenticated;
grant select on servicios, profesionales, horarios, horarios_especiales to anon, authenticated;
grant insert on turnos to anon, authenticated;
grant select, insert, update, delete on negocios, servicios, profesionales, horarios, horarios_especiales, turnos to authenticated;
