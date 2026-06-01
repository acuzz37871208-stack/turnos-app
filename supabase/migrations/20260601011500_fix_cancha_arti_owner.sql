do $$
declare
  v_owner_id uuid;
begin
  select id
    into v_owner_id
    from auth.users
   where lower(email) = lower('marcelorimoli00@gmail.com')
   limit 1;

  if v_owner_id is null then
    raise exception 'No existe usuario auth para marcelorimoli00@gmail.com';
  end if;

  update public.negocios
     set owner_id = v_owner_id
   where slug = 'cancha-arti';

  if not found then
    raise exception 'No existe negocio con slug cancha-arti';
  end if;
end $$;
