# Turnos App

Plataforma SaaS de gestión de turnos online para negocios como clínicas, peluquerías y canchas. Cada negocio tiene su propia agenda pública personalizable con URL única.

**Demo:** [turnos-app-three.vercel.app](https://turnos-app-three.vercel.app)

---

## Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Pagos:** MercadoPago (opcional por negocio)
- **Deploy:** Vercel

---

## Funcionalidades

**Para el cliente:**
- Reserva de turno en menos de 60 segundos
- Selección de servicio, profesional, fecha y horario disponible en tiempo real
- Pago online con MercadoPago (si el negocio lo requiere)
- Ver y cancelar turnos por teléfono

**Para el negocio:**
- Onboarding en 5 minutos
- URL pública personalizada (`/nombre-negocio`)
- Panel admin con agenda diaria y métricas
- Gestión de servicios, equipo y horarios
- Horarios diferenciados por día y excepciones (feriados, días especiales)
- Apariencia personalizable (colores y logo)
- Integración con MercadoPago por negocio

---

## Instalación local

```bash
# 1. Clonar el repo
git clone https://github.com/acuzz37871208-stack/turnos-app.git
cd turnos-app

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY

# 4. Ejecutar el schema en Supabase SQL Editor
# Ver archivo: supabase-schema.sql

# 5. Levantar el servidor
npm run dev
```

---

## Rutas

| URL | Descripción |
|-----|-------------|
| `/onboarding` | Registro de nuevo negocio |
| `/admin/login` | Login del panel admin |
| `/admin` | Dashboard del negocio |
| `/admin/configuracion` | Configuración completa |
| `/:slug` | Landing pública del negocio |
| `/:slug/reservar` | Flujo de reserva |
| `/:slug/confirmacion` | Confirmación del turno |
| `/:slug/mis-turnos` | Gestión de turnos del cliente |

---

## Variables de entorno

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

---

## Deploy

```bash
# Build
npm run build

# Deploy en Vercel (automático con push a main)
git push origin main
```

---

## MercadoPago

Cada negocio conecta su propia cuenta de MercadoPago desde el panel de configuración. Se requiere deployar la Edge Function de Supabase:

```bash
supabase functions deploy crear-preferencia-mp
supabase functions deploy mp-webhook
```

---

## Licencia

MIT
