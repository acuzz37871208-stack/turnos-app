create extension if not exists "pgcrypto";

create table if not exists negocios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  nombre text not null,
  tipo text not null check (tipo in ('clinica','peluqueria','cancha','otro')),
  slug text not null unique,
  telefono text,
  descripcion text,
  logo_url text,
  label_profesional text,
  color_primario text default '#7c6aff',
  color_fondo text default '#0a0a0f',
  mp_access_token text,
  activo boolean default true,
  created_at timestamptz default now()
);

create table if not exists profesionales (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid references negocios(id) on delete cascade,
  nombre text not null,
  especialidad text,
  activo boolean default true
);

create table if not exists horarios (
  id uuid primary key default gen_random_uuid(),
  profesional_id uuid references profesionales(id) on delete cascade,
  dia_semana int not null check (dia_semana between 0 and 6),
  hora_inicio time not null,
  hora_fin time not null
);

create table if not exists horarios_especiales (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid references negocios(id) on delete cascade,
  fecha date not null,
  tipo text not null check (tipo in ('cerrado','horario_especial')),
  hora_inicio time,
  hora_fin time,
  motivo text,
  created_at timestamptz default now(),
  unique (negocio_id, fecha)
);

create table if not exists servicios (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid references negocios(id) on delete cascade,
  nombre text not null,
  descripcion text,
  duracion_min int not null default 30,
  precio numeric(10,2),
  requiere_pago boolean default false,
  activo boolean default true
);

create table if not exists turnos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid references negocios(id) on delete cascade,
  servicio_id uuid references servicios(id),
  profesional_id uuid references profesionales(id),
  cliente_nombre text not null,
  cliente_telefono text not null,
  cliente_email text not null,
  nota text,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente','pendiente_pago','confirmado','atendido','cancelado')),
  mp_preference_id text,
  mp_payment_id text,
  created_at timestamptz default now()
);

alter table negocios add column if not exists label_profesional text;
alter table negocios add column if not exists color_primario text default '#7c6aff';
alter table negocios add column if not exists color_fondo text default '#0a0a0f';
alter table negocios add column if not exists mp_access_token text;

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
