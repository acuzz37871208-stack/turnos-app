alter table negocios enable row level security;
alter table profesionales enable row level security;
alter table horarios enable row level security;
alter table horarios_especiales enable row level security;
alter table servicios enable row level security;
alter table turnos enable row level security;

drop policy if exists "negocios_public_read" on negocios;
drop policy if exists "negocios_owner_read" on negocios;
drop policy if exists "negocios_owner_insert" on negocios;
drop policy if exists "negocios_owner_update" on negocios;
drop policy if exists "negocios_owner_delete" on negocios;

create policy "negocios_owner_read" on negocios
  for select using (auth.uid() = owner_id);

create policy "negocios_owner_insert" on negocios
  for insert with check (auth.uid() = owner_id);

create policy "negocios_owner_update" on negocios
  for update using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "negocios_owner_delete" on negocios
  for delete using (auth.uid() = owner_id);

drop policy if exists "servicios_public_read" on servicios;
drop policy if exists "servicios_owner_insert" on servicios;
drop policy if exists "servicios_owner_update" on servicios;
drop policy if exists "servicios_owner_delete" on servicios;

create policy "servicios_public_read" on servicios
  for select using (true);

create policy "servicios_owner_insert" on servicios
  for insert with check (negocio_id in (select id from negocios where owner_id = auth.uid()));

create policy "servicios_owner_update" on servicios
  for update using (negocio_id in (select id from negocios where owner_id = auth.uid()))
  with check (negocio_id in (select id from negocios where owner_id = auth.uid()));

create policy "servicios_owner_delete" on servicios
  for delete using (negocio_id in (select id from negocios where owner_id = auth.uid()));

drop policy if exists "profs_public_read" on profesionales;
drop policy if exists "profs_owner_insert" on profesionales;
drop policy if exists "profs_owner_update" on profesionales;
drop policy if exists "profs_owner_delete" on profesionales;

create policy "profs_public_read" on profesionales
  for select using (true);

create policy "profs_owner_insert" on profesionales
  for insert with check (negocio_id in (select id from negocios where owner_id = auth.uid()));

create policy "profs_owner_update" on profesionales
  for update using (negocio_id in (select id from negocios where owner_id = auth.uid()))
  with check (negocio_id in (select id from negocios where owner_id = auth.uid()));

create policy "profs_owner_delete" on profesionales
  for delete using (negocio_id in (select id from negocios where owner_id = auth.uid()));

drop policy if exists "horarios_public_read" on horarios;
drop policy if exists "horarios_owner_insert" on horarios;
drop policy if exists "horarios_owner_update" on horarios;
drop policy if exists "horarios_owner_delete" on horarios;

create policy "horarios_public_read" on horarios
  for select using (true);

create policy "horarios_owner_insert" on horarios
  for insert with check (
    profesional_id in (
      select p.id from profesionales p
      join negocios n on n.id = p.negocio_id
      where n.owner_id = auth.uid()
    )
  );

create policy "horarios_owner_update" on horarios
  for update using (
    profesional_id in (
      select p.id from profesionales p
      join negocios n on n.id = p.negocio_id
      where n.owner_id = auth.uid()
    )
  )
  with check (
    profesional_id in (
      select p.id from profesionales p
      join negocios n on n.id = p.negocio_id
      where n.owner_id = auth.uid()
    )
  );

create policy "horarios_owner_delete" on horarios
  for delete using (
    profesional_id in (
      select p.id from profesionales p
      join negocios n on n.id = p.negocio_id
      where n.owner_id = auth.uid()
    )
  );

drop policy if exists "horarios_especiales_public_read" on horarios_especiales;
drop policy if exists "horarios_especiales_owner_insert" on horarios_especiales;
drop policy if exists "horarios_especiales_owner_update" on horarios_especiales;
drop policy if exists "horarios_especiales_owner_delete" on horarios_especiales;

create policy "horarios_especiales_public_read" on horarios_especiales
  for select using (true);

create policy "horarios_especiales_owner_insert" on horarios_especiales
  for insert with check (negocio_id in (select id from negocios where owner_id = auth.uid()));

create policy "horarios_especiales_owner_update" on horarios_especiales
  for update using (negocio_id in (select id from negocios where owner_id = auth.uid()))
  with check (negocio_id in (select id from negocios where owner_id = auth.uid()));

create policy "horarios_especiales_owner_delete" on horarios_especiales
  for delete using (negocio_id in (select id from negocios where owner_id = auth.uid()));

drop policy if exists "turnos_insert_public" on turnos;
drop policy if exists "turnos_owner_read" on turnos;
drop policy if exists "turnos_owner_update" on turnos;
drop policy if exists "turnos_client_cancel" on turnos;

create policy "turnos_owner_read" on turnos
  for select using (negocio_id in (select id from negocios where owner_id = auth.uid()));

create policy "turnos_owner_update" on turnos
  for update using (negocio_id in (select id from negocios where owner_id = auth.uid()));

grant usage on schema public to anon, authenticated;
grant select on negocios_public to anon, authenticated;
grant select on turnos_disponibilidad to anon, authenticated;
grant execute on function public.liberar_turnos_pago_vencido() to anon;
grant execute on function public.liberar_turnos_pago_vencido() to authenticated;
grant select on servicios, profesionales, horarios, horarios_especiales to anon, authenticated;
-- La creación y cancelación pública de turnos se hace por Edge Function/RPC segura.
grant select, insert, update, delete on negocios, servicios, profesionales, horarios, horarios_especiales, turnos to authenticated;
