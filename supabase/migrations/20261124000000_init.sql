create table if not exists public.services (
  id text primary key, name text not null, description text,
  price integer not null check (price >= 0), price_from boolean not null default false,
  duration_min integer not null check (duration_min between 1 and 1440),
  active boolean not null default true, sort integer not null default 0
);

create table if not exists public.extras (
  id text primary key, name text not null, price integer not null check (price >= 0),
  mode text not null check (mode in ('unit', 'flat')),
  max_qty integer not null default 1 check (max_qty >= 1),
  active boolean not null default true, sort integer not null default 0
);

create table if not exists public.designs (
  id text primary key, name text not null, description text,
  params jsonb not null check (jsonb_typeof(params) = 'object'),
  tags text[] not null default '{}', photo_url text,
  service_id text references public.services on delete set null,
  active boolean not null default true, sort integer not null default 0,
  created_at timestamptz not null default now()
);

-- Los datos del catálogo se conservan en el turno aunque luego se borre el servicio o diseño.
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(), code text not null unique,
  created_at timestamptz not null default now(),
  client_name text not null, phone text not null, instagram text, notes text,
  service_id text not null, service_name text not null, extras jsonb not null default '[]',
  design_id text, design_name text, inspo_urls text[] not null default '{}',
  date date not null, time time not null, duration_min integer not null check (duration_min between 1 and 1440),
  total integer not null check (total >= 0), deposit integer not null check (deposit between 0 and total),
  status text not null check (status in ('pending_payment','paid','confirmed','completed','cancelled','rejected')),
  payment_id text, payment_status text, payment_method text, mp_preference_id text, admin_notes text
);
create index if not exists bookings_date_time_idx on public.bookings (date, time);

create table if not exists public.working_hours (
  weekday integer primary key check (weekday between 0 and 6),
  enabled boolean not null, start time not null, "end" time not null, check (not enabled or start < "end")
);

create table if not exists public.blocked_slots (
  id uuid primary key default gen_random_uuid(), date date not null,
  start time, "end" time, reason text,
  check ((start is null and "end" is null) or (start is not null and "end" is not null and start < "end"))
);
create index if not exists blocked_slots_date_idx on public.blocked_slots (date);

create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),
  data jsonb not null check (
    data ?& array['depositMode','depositValue','minNoticeHours','maxDaysAhead','paymentsMode','slotStepMin']
    and data->>'depositMode' in ('fixed','percent')
    and data->>'paymentsMode' in ('simulated','mercadopago')
    and jsonb_typeof(data->'depositMode') = 'string' and jsonb_typeof(data->'paymentsMode') = 'string'
    and jsonb_typeof(data->'depositValue') = 'number' and (data->>'depositValue')::numeric >= 0
    and (data->>'depositMode' <> 'percent' or (data->>'depositValue')::numeric <= 100)
    and jsonb_typeof(data->'minNoticeHours') = 'number' and (data->>'minNoticeHours')::numeric >= 0
    and jsonb_typeof(data->'maxDaysAhead') = 'number' and (data->>'maxDaysAhead')::integer >= 0
    and jsonb_typeof(data->'slotStepMin') = 'number' and (data->>'slotStepMin')::integer > 0
  )
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select from public.admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

do $$
declare
  rel text;
begin
  foreach rel in array array['services','extras','designs','bookings','working_hours','blocked_slots','settings','admins'] loop
    execute format('alter table public.%I enable row level security', rel);
    -- Evitá permisos implícitos (por ejemplo TRUNCATE, que no pasa por RLS).
    execute format('revoke all on public.%I from public, anon, authenticated', rel);
    execute format('grant select, insert, update, delete on public.%I to authenticated, service_role', rel);
    execute format('drop policy if exists admin_all on public.%I', rel);
    execute format('create policy admin_all on public.%I for all to authenticated
                    using ((select public.is_admin())) with check ((select public.is_admin()))', rel);
    if rel not in ('bookings','admins') then
      execute format('grant select on public.%I to anon', rel);
      execute format('drop policy if exists public_read on public.%I', rel);
      execute format('create policy public_read on public.%I for select to anon, authenticated using (%s)',
        rel, case when rel in ('services','extras','designs') then 'active' else 'true' end);
    end if;
  end loop;
end $$;

create schema if not exists studio_private;
revoke all on schema studio_private from public, anon, authenticated;

create or replace function studio_private.busy(s text, created timestamptz) returns boolean
language sql stable as $$
  select s in ('paid','confirmed','completed') or (s = 'pending_payment' and created > now() - interval '30 minutes');
$$;

create or replace function public.get_busy(p_from date, p_to date)
returns table(date date, "time" text, duration_min integer)
language sql stable security definer set search_path = public as $$
  select b.date, to_char(b.time, 'HH24:MI'), b.duration_min
  from public.bookings b where b.date between p_from and p_to and studio_private.busy(b.status,b.created_at)
  order by b.date, b.time;
$$;

-- El bloqueo se toma antes de tocar filas, también para los cambios de estado desde el panel o el webhook.
create or replace function studio_private.lock_schedule() returns trigger
language plpgsql set search_path = public as $$
begin
  perform pg_advisory_xact_lock(20261124, 1);
  return null;
end $$;

do $$
declare
  rel text;
begin
  foreach rel in array array['bookings','blocked_slots','working_hours'] loop
    execute format('drop trigger if exists lock_schedule on public.%I', rel);
    execute format('create trigger lock_schedule before insert or update or delete on public.%I
                    for each statement execute function studio_private.lock_schedule()', rel);
  end loop;
end $$;

create or replace function studio_private.check_slot() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  slot_start timestamp := new.date + new.time;
  slot_end timestamp := slot_start + make_interval(mins => new.duration_min);
begin
  if not studio_private.busy(new.status, new.created_at) then return new; end if;
  if tg_op = 'UPDATE' then
    if (old.date,old.time,old.duration_min) = (new.date,new.time,new.duration_min)
       and (studio_private.busy(old.status,old.created_at)
         or (old.status = 'pending_payment' and new.status = 'paid' and new.payment_method = 'mercadopago'))
       then return new; end if;
  end if;

  if exists (select from public.blocked_slots s
    where s.date between new.date and slot_end::date
      and s.date + coalesce(s.start, time '00:00') < slot_end
      and s.date + coalesce(s."end", time '24:00') > slot_start)
    or exists (select from public.bookings b
    where b.date between new.date - 1 and slot_end::date and b.id <> new.id
      and studio_private.busy(b.status,b.created_at)
      and b.date + b.time < slot_end and b.date + b.time + make_interval(mins => b.duration_min) > slot_start)
  then raise exception 'Ese horario ya no está disponible'; end if;

  -- Al reasignar un horario vencido, una acreditación tardía se registra sin reactivar el turno anterior.
  update public.bookings b set status = 'cancelled'
    where b.date between new.date - 1 and slot_end::date and b.id <> new.id
      and b.status = 'pending_payment' and not studio_private.busy(b.status,b.created_at)
      and b.date + b.time < slot_end and b.date + b.time + make_interval(mins => b.duration_min) > slot_start;
  return new;
end $$;
drop trigger if exists check_slot on public.bookings;
create trigger check_slot before insert or update of status,date,time,duration_min,created_at on public.bookings
for each row execute function studio_private.check_slot();

create or replace function studio_private.make_booking(p jsonb, manual boolean) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  client text := btrim(p->>'clientName');
  tel text := btrim(p->>'phone');
  s public.services;
  e public.extras;
  item jsonb;
  qty integer;
  extra_items jsonb := '[]';
  chosen_ids text[] := '{}';
  design_key text := nullif(p->>'designId','');
  design_label text;
  photos text[];
  day date;
  at_time time;
  local_now timestamp := now() at time zone 'America/Argentina/Buenos_Aires';
  cfg jsonb;
  amount numeric;
  upfront integer;
  booking_code text;
  saved public.bookings;
begin
  if manual and not public.is_admin() then raise exception 'Necesitás permisos de administración'; end if;
  if jsonb_typeof(p) is distinct from 'object' then raise exception 'Revisá los datos de la reserva'; end if;
  if jsonb_typeof(p->'clientName') is distinct from 'string' or length(client) not between 1 and 120
    then raise exception 'Ingresá tu nombre (hasta 120 caracteres)'; end if;
  if jsonb_typeof(p->'phone') is distinct from 'string' or length(tel) not between 5 and 40
    then raise exception 'Ingresá un teléfono válido (entre 5 y 40 caracteres)'; end if;
  if jsonb_typeof(p->'instagram') not in ('string','null') or length(p->>'instagram') > 120
    then raise exception 'Revisá el usuario de Instagram (hasta 120 caracteres)'; end if;
  if jsonb_typeof(p->'notes') not in ('string','null') or length(p->>'notes') > 2000
    then raise exception 'Las notas pueden tener hasta 2000 caracteres'; end if;
  if jsonb_typeof(p->'serviceId') is distinct from 'string' or length(p->>'serviceId') not between 1 and 160
    then raise exception 'Elegí un servicio válido'; end if;
  if jsonb_typeof(p->'designId') not in ('string','null') or length(design_key) > 160
    then raise exception 'Elegí un diseño válido'; end if;
  if coalesce(p->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or coalesce(p->>'time','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    then raise exception 'Ingresá una fecha y un horario válidos'; end if;
  begin
    day := (p->>'date')::date;
    at_time := (p->>'time')::time;
  exception when datetime_field_overflow or invalid_datetime_format then
    raise exception 'Ingresá una fecha válida';
  end;
  select * into s from public.services where id = p->>'serviceId' and active;
  if not found then raise exception 'El servicio elegido ya no está disponible'; end if;
  if design_key is not null then
    select name into design_label from public.designs where id = design_key and active;
    if not found then raise exception 'El diseño elegido ya no está disponible'; end if;
  end if;
  if jsonb_typeof(p->'extras') is distinct from 'array' or jsonb_typeof(p->'inspoUrls') is distinct from 'array'
    then raise exception 'Revisá la lista de extras y fotos'; end if;
  if jsonb_array_length(p->'inspoUrls') > 20 or exists (
    select from jsonb_array_elements(p->'inspoUrls') u where jsonb_typeof(u) <> 'string'
      or length(u #>> '{}') not between 1 and 4096 or (u #>> '{}') !~* '^https?://[^[:space:]]+$'
  ) then raise exception 'Revisá los enlaces de las fotos de inspiración (hasta 20 fotos)'; end if;
  photos := array(select jsonb_array_elements_text(p->'inspoUrls'));

  amount := s.price;
  if jsonb_array_length(p->'extras') > 100 then raise exception 'Hay demasiados extras'; end if;
  for item in select jsonb_array_elements(p->'extras') loop
    if jsonb_typeof(item->'extraId') is distinct from 'string' or length(item->>'extraId') not between 1 and 160
      then raise exception 'Elegí un extra válido'; end if;
    select * into e from public.extras where id = item->>'extraId' and active;
    if not found then raise exception 'Uno de los extras ya no está disponible'; end if;
    if e.id = any(chosen_ids) then raise exception 'Hay extras repetidos'; end if;
    if jsonb_typeof(item->'qty') is distinct from 'number' or (item->>'qty') !~ '^-?[0-9]+$'
      then raise exception 'La cantidad del extra debe ser un número entero'; end if;
    qty := case when e.mode = 'flat' then 1 else greatest(1, least(e.max_qty, (item->>'qty')::numeric)) end;
    amount := amount + e.price::numeric * qty;
    chosen_ids := array_append(chosen_ids,e.id);
    extra_items := extra_items || jsonb_build_object('extraId',e.id,'name',e.name,'price',e.price,'qty',qty);
  end loop;
  if amount > 2147483647 then raise exception 'El importe supera el máximo permitido'; end if;
  select data into cfg from public.settings where id = 1;
  if not found then raise exception 'Falta configurar el estudio'; end if;
  upfront := case cfg->>'depositMode'
    when 'fixed' then least(amount, round((cfg->>'depositValue')::numeric))
    else round(amount * (cfg->>'depositValue')::numeric / 100) end;

  perform pg_advisory_xact_lock(20261124, 1);
  if not manual then
    if day + at_time < local_now + (cfg->>'minNoticeHours')::numeric * interval '1 hour'
      then raise exception 'Ese horario no cumple con la anticipación mínima'; end if;
    if day - local_now::date > (cfg->>'maxDaysAhead')::integer then raise exception 'La fecha supera el plazo de reserva'; end if;
    if not exists (select from public.working_hours w where w.weekday = extract(dow from day) and w.enabled
      and at_time >= w.start and day + at_time + make_interval(mins => s.duration_min) <= day + w."end")
      then raise exception 'El turno queda fuera del horario de atención'; end if;
  end if;
  for attempt in 1..32 loop
    select 'SN-' || string_agg(substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',1 + floor(random()*36)::int,1),'')
      into booking_code from generate_series(1,4);
    insert into public.bookings(code, client_name, phone, instagram, notes, service_id, service_name,
      extras, design_id, design_name, inspo_urls, date, time, duration_min, total, deposit, status, payment_method)
    values (booking_code,client,tel,nullif(btrim(p->>'instagram'),''),nullif(btrim(p->>'notes'),''),
      s.id,s.name,extra_items,design_key,design_label,photos,day,at_time,s.duration_min,amount,upfront,
      case when manual then 'confirmed' else 'pending_payment' end, case when manual then 'manual' end)
    on conflict (code) do nothing returning * into saved;
    if found then return saved; end if;
  end loop;
  raise exception 'No se pudo generar el código de reserva. Volvé a intentar';
end $$;

create or replace function public.create_booking(p jsonb) returns public.bookings
language sql security definer set search_path = public as $$ select studio_private.make_booking(p,false); $$;
create or replace function public.create_manual_booking(p jsonb) returns public.bookings
language sql security definer set search_path = public as $$ select studio_private.make_booking(p,true); $$;
create or replace function public.get_booking(p_id uuid) returns public.bookings
language sql stable security definer set search_path = public as $$ select b from public.bookings b where b.id = p_id; $$;

create or replace function public.confirm_simulated_payment(p_id uuid, p_approved boolean) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  saved public.bookings;
begin
  if (select data->>'paymentsMode' from public.settings where id = 1) is distinct from 'simulated'
    then raise exception 'Los pagos simulados están desactivados'; end if;
  if p_approved is null then raise exception 'Falta el resultado del pago'; end if;
  update public.bookings set status = case when p_approved then 'paid' else status end,
    payment_method = 'simulated', payment_status = case when p_approved then 'approved' else 'rejected' end,
    payment_id = case when p_approved then 'SIM-' || gen_random_uuid()::text else payment_id end
  where id = p_id and status = 'pending_payment' returning * into saved;
  if not found then raise exception 'La reserva no tiene un pago pendiente'; end if;
  return saved;
end $$;

-- El servicio verifica origen, referencia, moneda e importe antes de llamar a esta operación atómica.
create or replace function public.record_mp_payment(p_id uuid, p_payment_id text, p_status text)
returns public.bookings language sql set search_path = public as $$
  update public.bookings set payment_id = p_payment_id, payment_status = p_status, payment_method = 'mercadopago',
    status = case when status = 'pending_payment' and p_status = 'approved' then 'paid' else status end
  where id = p_id returning *;
$$;
revoke all on function public.record_mp_payment(uuid,text,text) from public, anon, authenticated;
grant execute on function public.record_mp_payment(uuid,text,text) to service_role;

revoke all on function public.get_busy(date,date), public.create_booking(jsonb), public.create_manual_booking(jsonb),
  public.get_booking(uuid), public.confirm_simulated_payment(uuid,boolean) from public;
grant execute on function public.get_busy(date,date), public.create_booking(jsonb), public.create_manual_booking(jsonb),
  public.get_booking(uuid), public.confirm_simulated_payment(uuid,boolean) to anon, authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('inspo','inspo',true,8388608,array['image/jpeg','image/png','image/webp','image/heic']),
       ('designs','designs',true,null,null)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists studio_read_images on storage.objects;
create policy studio_read_images on storage.objects for select to anon, authenticated using (bucket_id in ('inspo','designs'));
drop policy if exists studio_upload_inspo on storage.objects;
create policy studio_upload_inspo on storage.objects for insert to anon, authenticated with check (bucket_id = 'inspo');
drop policy if exists studio_manage_designs on storage.objects;
create policy studio_manage_designs on storage.objects for all to authenticated
using (bucket_id = 'designs' and (select public.is_admin())) with check (bucket_id = 'designs' and (select public.is_admin()));
drop policy if exists studio_delete_inspo on storage.objects;
create policy studio_delete_inspo on storage.objects for delete to authenticated using (bucket_id = 'inspo' and (select public.is_admin()));
