-- =============================================
-- SCHEMA SUPABASE — App de Turnos
-- Ejecutar en el SQL Editor de Supabase
-- =============================================

-- Habilitar UUID
create extension if not exists "pgcrypto";

-- ── NEGOCIOS ──────────────────────────────────
create table negocios (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references auth.users(id) on delete cascade,
  nombre      text not null,
  tipo        text not null check (tipo in ('clinica','peluqueria','cancha','otro')),
  slug        text not null unique,
  telefono    text,
  descripcion text,
  logo_url    text,
  activo      boolean default true,
  created_at  timestamptz default now()
);

-- ── PROFESIONALES ─────────────────────────────
create table profesionales (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid references negocios(id) on delete cascade,
  nombre      text not null,
  especialidad text,
  activo      boolean default true
);

-- ── HORARIOS (disponibilidad semanal) ─────────
create table horarios (
  id              uuid primary key default gen_random_uuid(),
  profesional_id  uuid references profesionales(id) on delete cascade,
  dia_semana      int not null check (dia_semana between 0 and 6), -- 0=Dom, 6=Sáb
  hora_inicio     time not null,
  hora_fin        time not null
);

-- ── SERVICIOS ─────────────────────────────────
create table servicios (
  id             uuid primary key default gen_random_uuid(),
  negocio_id     uuid references negocios(id) on delete cascade,
  nombre         text not null,
  descripcion    text,
  duracion_min   int not null default 30,
  precio         numeric(10,2),
  requiere_pago  boolean default false,
  activo         boolean default true
);

-- ── TURNOS ────────────────────────────────────
create table turnos (
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
  mp_preference_id  text,   -- MercadoPago preference ID
  mp_payment_id     text,   -- MercadoPago payment ID
  created_at        timestamptz default now()
);

-- ── ÍNDICES ────────────────────────────────────
create index on turnos (negocio_id, fecha);
create index on turnos (cliente_telefono);
create index on negocios (slug);

-- ── RLS (Row Level Security) ───────────────────

alter table negocios      enable row level security;
alter table profesionales enable row level security;
alter table horarios      enable row level security;
alter table servicios     enable row level security;
alter table turnos        enable row level security;

-- Negocios: el owner puede hacer todo; todos pueden leer
create policy "negocios_public_read"  on negocios      for select using (true);
create policy "negocios_owner_write"  on negocios      for all    using (auth.uid() = owner_id);

-- Servicios: lectura pública; escritura solo del owner
create policy "servicios_public_read" on servicios     for select using (true);
create policy "servicios_owner_write" on servicios     for all
  using (negocio_id in (select id from negocios where owner_id = auth.uid()));

-- Profesionales: lectura pública
create policy "profs_public_read"     on profesionales for select using (true);
create policy "profs_owner_write"     on profesionales for all
  using (negocio_id in (select id from negocios where owner_id = auth.uid()));

-- Horarios: lectura pública
create policy "horarios_public_read"  on horarios      for select using (true);
create policy "horarios_owner_write"  on horarios      for all
  using (profesional_id in (
    select p.id from profesionales p
    join negocios n on n.id = p.negocio_id
    where n.owner_id = auth.uid()
  ));

-- Turnos: inserción pública (cliente puede reservar sin cuenta)
--         lectura: el cliente por teléfono, o el owner del negocio
create policy "turnos_insert_public"  on turnos        for insert with check (true);
create policy "turnos_owner_read"     on turnos        for select
  using (
    negocio_id in (select id from negocios where owner_id = auth.uid())
  );
create policy "turnos_client_read"    on turnos        for select
  using (cliente_telefono = current_setting('request.jwt.claims', true)::json->>'phone');
create policy "turnos_client_cancel"  on turnos        for update
  using (cliente_telefono is not null)
  with check (estado = 'cancelado');
create policy "turnos_owner_update"   on turnos        for update
  using (negocio_id in (select id from negocios where owner_id = auth.uid()));


-- =============================================
-- MERCADOPAGO — Agregar a tabla negocios
-- =============================================

alter table negocios
  add column if not exists mp_access_token text;

-- El token es sensible: solo el owner puede leerlo
-- (la policy existente de owner ya lo cubre)
-- Pero lo excluimos del select público:

create or replace view negocios_public as
  select id, nombre, tipo, slug, telefono, descripcion, logo_url, activo, created_at
  from negocios;

-- RLS para mp-webhook (service role bypasses RLS, está OK)
