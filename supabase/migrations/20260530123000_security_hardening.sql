-- Seguridad pre-producción.
-- La reserva pública directa queda cerrada: el frontend debe usar la Edge
-- Function crear-turno, que valida negocio, servicio, recurso, horario y solapes.
drop policy if exists "turnos_insert_public" on public.turnos;

-- La cancelación pública debe pasar por cancelar_turno_cliente(), que valida
-- slug + teléfono + email. Esta policy era demasiado amplia para authenticated.
drop policy if exists "turnos_client_cancel" on public.turnos;

grant execute on function public.buscar_turnos_cliente(text, text, text) to anon;
grant execute on function public.buscar_turnos_cliente(text, text, text) to authenticated;
grant execute on function public.cancelar_turno_cliente(uuid, text, text, text) to anon;
grant execute on function public.cancelar_turno_cliente(uuid, text, text, text) to authenticated;
