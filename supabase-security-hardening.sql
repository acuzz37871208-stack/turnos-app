-- Seguridad pre-producción.
-- Ejecutar en Supabase SQL Editor después de deployar la función crear-turno.

-- La cancelación pública debe pasar por cancelar_turno_cliente(), que valida
-- slug + teléfono + email. Esta policy era demasiado amplia para authenticated.
drop policy if exists "turnos_client_cancel" on public.turnos;

-- La reserva pública directa queda cerrada: el frontend debe usar la Edge
-- Function crear-turno, que valida negocio, servicio, recurso, horario y solapes.
drop policy if exists "turnos_insert_public" on public.turnos;

-- Mantener permiso de ejecución de las RPC seguras de cliente.
grant execute on function public.buscar_turnos_cliente(text, text, text) to anon;
grant execute on function public.buscar_turnos_cliente(text, text, text) to authenticated;
grant execute on function public.cancelar_turno_cliente(uuid, text, text, text) to anon;
grant execute on function public.cancelar_turno_cliente(uuid, text, text, text) to authenticated;
