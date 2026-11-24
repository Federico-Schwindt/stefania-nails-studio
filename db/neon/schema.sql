-- =====================================================================
--  Stefania Nails Studio · esquema Neon (Postgres)
--
--  Modelo de seguridad:
--   * Las tablas viven en el esquema `app`, sin permisos para el rol web.
--   * El navegador se conecta con el rol `studio_web`, que SÓLO puede
--     ejecutar las funciones del esquema `api` (SECURITY DEFINER).
--   * Las funciones de administración exigen un token de sesión que se
--     obtiene con api.admin_login(contraseña).
--  Este archivo es idempotente: se puede volver a correr para actualizar.
-- =====================================================================

create extension if not exists pgcrypto;

create schema if not exists app;
create schema if not exists api;
revoke all on schema app from public;
revoke create on schema public from public;

-- Las funciones nuevas no quedan ejecutables por PUBLIC por defecto.
alter default privileges revoke execute on functions from public;

-- ------------------------------------------------------------- tablas
create table if not exists app.services (
  id text primary key,
  name text not null,
  description text,
  price integer not null check (price >= 0),
  price_from boolean not null default false,
  duration_min integer not null check (duration_min between 5 and 720),
  active boolean not null default true,
  sort integer not null default 0
);

create table if not exists app.extras (
  id text primary key,
  name text not null,
  price integer not null check (price >= 0),
  mode text not null check (mode in ('unit', 'flat')),
  max_qty integer not null default 1 check (max_qty between 1 and 50),
  active boolean not null default true,
  sort integer not null default 0
);

create table if not exists app.designs (
  id text primary key,
  name text not null,
  description text,
  tags text[] not null default '{}',
  photo_url text,
  render_url text,
  params jsonb not null default '{}'::jsonb,
  service_id text,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists app.bookings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_at timestamptz not null default now(),
  client_name text not null,
  phone text not null,
  phone_key text not null,
  instagram text,
  notes text,
  service_id text not null,
  service_name text not null,
  extras jsonb not null default '[]'::jsonb,
  design_id text,
  design_name text,
  color jsonb,
  inspo_urls text[] not null default '{}',
  date date not null,
  time time not null,
  duration_min integer not null,
  total integer not null check (total >= 0),
  deposit integer not null check (deposit >= 0),
  paid_amount integer not null default 0 check (paid_amount >= 0),
  status text not null check (status in ('pending_payment','payment_review','paid','confirmed','completed','no_show','cancelled','rejected')),
  deposit_method text,
  deposit_proof_url text,
  balance_method text,
  payment_id text,
  reminded_at timestamptz,
  admin_notes text
);
create index if not exists bookings_date_idx on app.bookings (date, time);
create index if not exists bookings_phone_idx on app.bookings (phone_key);

create table if not exists app.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references app.bookings on delete cascade,
  amount integer not null check (amount > 0),
  method text not null check (method in ('transfer','mercadopago','cash','simulated','other')),
  kind text not null check (kind in ('deposit','balance')),
  created_at timestamptz not null default now()
);
create index if not exists payments_created_idx on app.payments (created_at);

create table if not exists app.working_hours (
  weekday integer primary key check (weekday between 0 and 6),
  enabled boolean not null,
  start time not null,
  "end" time not null
);

create table if not exists app.blocked_slots (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start time,
  "end" time,
  reason text
);
create index if not exists blocked_date_idx on app.blocked_slots (date);

create table if not exists app.settings (
  id integer primary key default 1 check (id = 1),
  data jsonb not null
);

create table if not exists app.clients (
  phone_key text primary key,
  name text,
  instagram text,
  notes text,
  birthday text,
  created_at timestamptz not null default now()
);

create table if not exists app.waitlist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  service_id text,
  preferred text not null default '',
  status text not null default 'open' check (status in ('open','contacted','booked','closed'))
);

create table if not exists app.images (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  mime text not null,
  bytes integer not null,
  data bytea not null
);
create index if not exists images_created_idx on app.images (created_at);

create table if not exists app.admin (
  id integer primary key default 1 check (id = 1),
  password_hash text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz
);

create table if not exists app.sessions (
  token_hash text primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- --------------------------------------------------------- utilidades
create or replace function app.phone_key(p text) returns text
language sql immutable as $$
  select right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 10)
$$;

create or replace function app.hold_minutes() returns integer
language sql immutable as $$ select 60 $$;

-- Un turno ocupa la agenda si está pagado/confirmado o si se creó hace menos de una hora.
create or replace function app.is_busy(s text, created timestamptz) returns boolean
language sql stable as $$
  select s in ('payment_review','paid','confirmed','completed')
      or (s = 'pending_payment' and created > now() - make_interval(mins => app.hold_minutes()))
$$;

create or replace function app.local_now() returns timestamp
language sql stable as $$ select now() at time zone 'America/Argentina/Buenos_Aires' $$;

create or replace function app.booking_json(b app.bookings) returns jsonb
language sql stable as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', b.id, 'code', b.code, 'createdAt', b.created_at,
    'clientName', b.client_name, 'phone', b.phone, 'instagram', b.instagram, 'notes', b.notes,
    'serviceId', b.service_id, 'serviceName', b.service_name, 'extras', b.extras,
    'designId', b.design_id, 'designName', b.design_name, 'color', b.color,
    'inspoUrls', to_jsonb(b.inspo_urls),
    'date', to_char(b.date, 'YYYY-MM-DD'), 'time', to_char(b.time, 'HH24:MI'),
    'durationMin', b.duration_min, 'total', b.total, 'deposit', b.deposit, 'paidAmount', b.paid_amount,
    'status', b.status, 'depositMethod', b.deposit_method, 'depositProofUrl', b.deposit_proof_url,
    'balanceMethod', b.balance_method, 'paymentId', b.payment_id, 'remindedAt', b.reminded_at,
    'adminNotes', b.admin_notes
  ))
$$;

create or replace function app.service_json(s app.services) returns jsonb
language sql stable as $$
  select jsonb_strip_nulls(jsonb_build_object('id', s.id, 'name', s.name, 'description', s.description,
    'price', s.price, 'priceFrom', s.price_from, 'durationMin', s.duration_min, 'active', s.active, 'sort', s.sort))
$$;

create or replace function app.extra_json(e app.extras) returns jsonb
language sql stable as $$
  select jsonb_build_object('id', e.id, 'name', e.name, 'price', e.price, 'mode', e.mode,
    'maxQty', e.max_qty, 'active', e.active, 'sort', e.sort)
$$;

create or replace function app.design_json(d app.designs) returns jsonb
language sql stable as $$
  select jsonb_strip_nulls(jsonb_build_object('id', d.id, 'name', d.name, 'description', d.description,
    'tags', to_jsonb(d.tags), 'photoUrl', d.photo_url, 'renderUrl', d.render_url, 'params', d.params,
    'serviceId', d.service_id, 'active', d.active, 'sort', d.sort, 'createdAt', d.created_at))
$$;

create or replace function app.hours_json() returns jsonb
language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('weekday', weekday, 'enabled', enabled,
    'start', to_char(start, 'HH24:MI'), 'end', to_char("end", 'HH24:MI')) order by weekday), '[]'::jsonb)
  from app.working_hours
$$;

create or replace function app.require_admin(p_token text) returns void
language plpgsql as $$
begin
  if p_token is null or not exists (
    select from app.sessions where token_hash = encode(digest(p_token, 'sha256'), 'hex') and expires_at > now()
  ) then
    raise exception 'Tu sesión venció. Volvé a ingresar.' using errcode = '28000';
  end if;
end $$;

-- Valida que un horario esté libre (bloqueos y otros turnos). Llamar con el lock tomado.
create or replace function app.assert_slot_free(p_date date, p_time time, p_duration integer, p_ignore uuid)
returns void language plpgsql as $$
declare
  s timestamp := p_date + p_time;
  e timestamp := s + make_interval(mins => p_duration);
begin
  if exists (select from app.blocked_slots bl where bl.date = p_date
      and (bl.start is null or (p_date + bl.start < e and p_date + bl."end" > s))) then
    raise exception 'Ese horario ya no está disponible. Elegí otro, por favor.';
  end if;
  if exists (select from app.bookings b where b.date = p_date and b.id is distinct from p_ignore
      and app.is_busy(b.status, b.created_at)
      and b.date + b.time < e and b.date + b.time + make_interval(mins => b.duration_min) > s) then
    raise exception 'Ese horario ya no está disponible. Elegí otro, por favor.';
  end if;
end $$;

create or replace function app.make_booking(p jsonb, manual boolean) returns app.bookings
language plpgsql as $$
declare
  v_name text := btrim(coalesce(p->>'clientName', ''));
  v_phone text := btrim(coalesce(p->>'phone', ''));
  v_day date;
  v_time time;
  s app.services;
  e app.extras;
  item jsonb;
  qty integer;
  extra_items jsonb := '[]'::jsonb;
  amount integer;
  upfront integer;
  cfg jsonb;
  v_design text := nullif(p->>'designId', '');
  v_design_name text;
  v_code text;
  saved app.bookings;
  photos text[];
begin
  if length(v_name) < 2 or length(v_name) > 120 then raise exception 'Ingresá tu nombre y apellido.'; end if;
  if length(regexp_replace(v_phone, '\D', '', 'g')) < 8 or length(v_phone) > 40 then
    raise exception 'Ingresá un WhatsApp válido, con código de área.';
  end if;
  if length(coalesce(p->>'notes', '')) > 2000 then raise exception 'Las notas pueden tener hasta 2000 caracteres.'; end if;
  begin
    v_day := (p->>'date')::date;
    v_time := (p->>'time')::time;
  exception when others then
    raise exception 'Elegí una fecha y un horario válidos.';
  end;
  select * into s from app.services where id = p->>'serviceId' and active;
  if not found then raise exception 'El servicio elegido no está disponible.'; end if;
  if v_design is not null then
    select name into v_design_name from app.designs where id = v_design;
  end if;
  if jsonb_typeof(coalesce(p->'inspoUrls', '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p->'inspoUrls', '[]'::jsonb)) > 6 then
    raise exception 'Podés subir hasta 6 imágenes de inspiración.';
  end if;
  photos := array(select jsonb_array_elements_text(coalesce(p->'inspoUrls', '[]'::jsonb)));
  if exists (select from unnest(photos) u where length(u) > 400) then raise exception 'Revisá las imágenes de inspiración.'; end if;

  amount := s.price;
  for item in select * from jsonb_array_elements(coalesce(p->'extras', '[]'::jsonb)) loop
    select * into e from app.extras where id = item->>'extraId' and active;
    if not found then continue; end if;
    qty := case when e.mode = 'flat' then 1 else greatest(1, least(e.max_qty, coalesce((item->>'qty')::integer, 1))) end;
    amount := amount + e.price * qty;
    extra_items := extra_items || jsonb_build_object('extraId', e.id, 'name', e.name, 'price', e.price, 'qty', qty);
  end loop;

  select data into cfg from app.settings where id = 1;
  upfront := case when manual then 0
    when cfg->>'depositMode' = 'percent' then round(amount * (cfg->>'depositValue')::numeric / 100)
    else least(amount, (cfg->>'depositValue')::integer) end;

  perform pg_advisory_xact_lock(20261124);
  if not manual then
    if v_day + v_time < app.local_now() + make_interval(hours => coalesce((cfg->>'minNoticeHours')::integer, 0)) then
      raise exception 'Ese horario ya no se puede reservar online. Elegí otro, por favor.';
    end if;
    if v_day - app.local_now()::date > coalesce((cfg->>'maxDaysAhead')::integer, 60) then
      raise exception 'Todavía no se puede reservar esa fecha.';
    end if;
    if not exists (select from app.working_hours w where w.weekday = extract(dow from v_day)::integer and w.enabled
        and v_time >= w.start and v_time + make_interval(mins => s.duration_min) <= w."end") then
      raise exception 'El turno queda fuera del horario de atención.';
    end if;
  end if;
  perform app.assert_slot_free(v_day, v_time, s.duration_min, null);

  for i in 1..20 loop
    v_code := 'SN-' || (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 4));
    exit when not exists (select from app.bookings where code = v_code);
  end loop;

  insert into app.bookings (code, client_name, phone, phone_key, instagram, notes, service_id, service_name, extras,
    design_id, design_name, color, inspo_urls, date, time, duration_min, total, deposit, status, deposit_method)
  values (v_code, v_name, v_phone, app.phone_key(v_phone), nullif(regexp_replace(btrim(coalesce(p->>'instagram', '')), '^@', ''), ''),
    nullif(btrim(coalesce(p->>'notes', '')), ''), s.id, s.name, extra_items, v_design, v_design_name,
    case when jsonb_typeof(p->'color') = 'object' then p->'color' end, photos, v_day, v_time, s.duration_min,
    amount, upfront, case when manual then 'confirmed' else 'pending_payment' end, null)
  returning * into saved;

  insert into app.clients (phone_key, name, instagram) values (saved.phone_key, saved.client_name, saved.instagram)
  on conflict (phone_key) do nothing;
  return saved;
end $$;

-- ================================================== API pública (web)
create or replace function api.catalog() returns jsonb
language sql stable security definer set search_path = app, public as $$
  select jsonb_build_object(
    'services', coalesce((select jsonb_agg(app.service_json(s) order by s.sort) from app.services s where s.active), '[]'::jsonb),
    'extras', coalesce((select jsonb_agg(app.extra_json(e) order by e.sort) from app.extras e where e.active), '[]'::jsonb),
    'designs', coalesce((select jsonb_agg(app.design_json(d) order by d.sort) from app.designs d where d.active), '[]'::jsonb),
    'settings', (select data from app.settings where id = 1),
    'hours', app.hours_json())
$$;

create or replace function api.blocked(p_from date, p_to date) returns jsonb
language sql stable security definer set search_path = app, public as $$
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', id, 'date', to_char(date, 'YYYY-MM-DD'),
    'start', to_char(start, 'HH24:MI'), 'end', to_char("end", 'HH24:MI'), 'reason', reason)) order by date, start), '[]'::jsonb)
  from app.blocked_slots where date between p_from and p_to
$$;

create or replace function api.busy(p_from date, p_to date) returns jsonb
language sql stable security definer set search_path = app, public as $$
  select coalesce(jsonb_agg(jsonb_build_object('date', to_char(date, 'YYYY-MM-DD'), 'time', to_char(time, 'HH24:MI'),
    'durationMin', duration_min) order by date, time), '[]'::jsonb)
  from app.bookings where date between p_from and p_to and app.is_busy(status, created_at)
$$;

create or replace function api.upload_image(p_data text, p_mime text) returns text
language plpgsql security definer set search_path = app, public as $$
declare
  raw bytea;
  new_id uuid;
begin
  if p_mime not in ('image/jpeg', 'image/png', 'image/webp') then raise exception 'Formato de imagen no permitido.'; end if;
  raw := decode(p_data, 'base64');
  if length(raw) > 1200000 then raise exception 'La imagen es muy pesada. Probá con otra.'; end if;
  if (select count(*) from app.images where created_at > now() - interval '1 hour') > 400 then
    raise exception 'Se subieron muchas imágenes. Probá de nuevo en un rato.';
  end if;
  insert into app.images (mime, bytes, data) values (p_mime, length(raw), raw) returning id into new_id;
  return 'img:' || new_id;
end $$;

create or replace function api.image(p_id uuid) returns text
language sql stable security definer set search_path = app, public as $$
  select 'data:' || mime || ';base64,' || replace(encode(data, 'base64'), E'\n', '') from app.images where id = p_id
$$;

create or replace function api.create_booking(p jsonb) returns jsonb
language sql security definer set search_path = app, public as $$
  select app.booking_json(app.make_booking(p, false))
$$;

create or replace function api.get_booking(p_id uuid) returns jsonb
language sql stable security definer set search_path = app, public as $$
  select app.booking_json(b) from app.bookings b where b.id = p_id
$$;

create or replace function api.find_booking(p_code text, p_phone text) returns jsonb
language sql stable security definer set search_path = app, public as $$
  select app.booking_json(b) from app.bookings b
  where upper(btrim(b.code)) = upper(btrim(p_code)) and b.phone_key = app.phone_key(p_phone)
$$;

create or replace function api.cancel_booking(p_id uuid, p_phone text) returns jsonb
language plpgsql security definer set search_path = app, public as $$
declare
  b app.bookings;
  hrs integer;
begin
  select * into b from app.bookings where id = p_id and phone_key = app.phone_key(p_phone) for update;
  if not found then raise exception 'No encontramos el turno con ese teléfono.'; end if;
  if b.status in ('cancelled', 'rejected', 'completed', 'no_show') then raise exception 'Este turno ya no se puede cancelar.'; end if;
  hrs := coalesce((select (data->>'cancelHours')::integer from app.settings where id = 1), 24);
  if b.date + b.time < app.local_now() + make_interval(hours => hrs) then
    raise exception 'Faltan menos de % horas para el turno: escribile a Stefania por WhatsApp para cancelarlo.', hrs;
  end if;
  update app.bookings set status = 'cancelled' where id = b.id returning * into b;
  return app.booking_json(b);
end $$;

create or replace function api.report_deposit(p_id uuid, p_method text, p_proof text) returns jsonb
language plpgsql security definer set search_path = app, public as $$
declare
  b app.bookings;
begin
  if p_method not in ('transfer', 'mercadopago', 'other') then raise exception 'Elegí cómo pagaste la seña.'; end if;
  if length(coalesce(p_proof, '')) > 400 then raise exception 'Revisá el comprobante.'; end if;
  update app.bookings set status = 'payment_review', deposit_method = p_method,
    deposit_proof_url = coalesce(nullif(p_proof, ''), deposit_proof_url)
  where id = p_id and status in ('pending_payment', 'payment_review') returning * into b;
  if not found then raise exception 'Este turno no tiene una seña pendiente.'; end if;
  return app.booking_json(b);
end $$;

create or replace function api.confirm_simulated(p_id uuid, p_approved boolean) returns jsonb
language plpgsql security definer set search_path = app, public as $$
declare
  b app.bookings;
begin
  if (select data->>'paymentsMode' from app.settings where id = 1) <> 'simulated' then
    raise exception 'Los pagos de prueba están desactivados.';
  end if;
  select * into b from app.bookings where id = p_id and status = 'pending_payment' for update;
  if not found then raise exception 'Este turno no tiene una seña pendiente.'; end if;
  if p_approved then
    update app.bookings set status = 'paid', deposit_method = 'simulated', paid_amount = paid_amount + deposit,
      payment_id = 'SIM-' || upper(substr(md5(random()::text), 1, 8)) where id = p_id returning * into b;
    if b.deposit > 0 then insert into app.payments (booking_id, amount, method, kind) values (b.id, b.deposit, 'simulated', 'deposit'); end if;
  end if;
  return app.booking_json(b);
end $$;

create or replace function api.join_waitlist(p jsonb) returns void
language plpgsql security definer set search_path = app, public as $$
begin
  if length(btrim(coalesce(p->>'name', ''))) < 2 then raise exception 'Ingresá tu nombre.'; end if;
  if length(regexp_replace(coalesce(p->>'phone', ''), '\D', '', 'g')) < 8 then raise exception 'Ingresá un WhatsApp válido.'; end if;
  if (select count(*) from app.waitlist where created_at > now() - interval '1 hour') > 100 then
    raise exception 'Probá de nuevo en un rato.';
  end if;
  insert into app.waitlist (name, phone, service_id, preferred)
  values (left(btrim(p->>'name'), 120), left(btrim(p->>'phone'), 40), nullif(p->>'serviceId', ''), left(coalesce(p->>'preferred', ''), 500));
end $$;

-- ================================================== API de administración
create or replace function api.admin_login(p_password text) returns text
language plpgsql security definer set search_path = app, public as $$
declare
  a app.admin;
  token text;
begin
  select * into a from app.admin where id = 1 for update;
  if not found then raise exception 'Falta configurar la contraseña del panel.'; end if;
  if a.locked_until is not null and a.locked_until > now() then
    raise exception 'Demasiados intentos. Probá de nuevo en unos minutos.';
  end if;
  if crypt(coalesce(p_password, ''), a.password_hash) <> a.password_hash then
    update app.admin set failed_attempts = failed_attempts + 1,
      locked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' end where id = 1;
    raise exception 'Contraseña incorrecta.';
  end if;
  update app.admin set failed_attempts = 0, locked_until = null where id = 1;
  delete from app.sessions where expires_at < now();
  token := encode(gen_random_bytes(32), 'hex');
  insert into app.sessions (token_hash, expires_at) values (encode(digest(token, 'sha256'), 'hex'), now() + interval '30 days');
  return token;
end $$;

create or replace function api.admin_logout(p_token text) returns void
language sql security definer set search_path = app, public as $$
  delete from app.sessions where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
$$;

create or replace function api.admin_check(p_token text) returns boolean
language sql stable security definer set search_path = app, public as $$
  select exists (select from app.sessions where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex') and expires_at > now())
$$;

create or replace function api.admin_change_password(p_token text, p_current text, p_next text) returns void
language plpgsql security definer set search_path = app, public as $$
begin
  perform app.require_admin(p_token);
  if length(coalesce(p_next, '')) < 8 then raise exception 'La contraseña nueva tiene que tener al menos 8 caracteres.'; end if;
  if not exists (select from app.admin where id = 1 and crypt(coalesce(p_current, ''), password_hash) = password_hash) then
    raise exception 'La contraseña actual no es correcta.';
  end if;
  update app.admin set password_hash = crypt(p_next, gen_salt('bf', 10)) where id = 1;
  delete from app.sessions where token_hash <> encode(digest(p_token, 'sha256'), 'hex');
end $$;

create or replace function api.admin_catalog(p_token text) returns jsonb
language plpgsql stable security definer set search_path = app, public as $$
begin
  perform app.require_admin(p_token);
  return jsonb_build_object(
    'services', coalesce((select jsonb_agg(app.service_json(s) order by s.sort) from app.services s), '[]'::jsonb),
    'extras', coalesce((select jsonb_agg(app.extra_json(e) order by e.sort) from app.extras e), '[]'::jsonb),
    'designs', coalesce((select jsonb_agg(app.design_json(d) order by d.sort) from app.designs d), '[]'::jsonb),
    'settings', (select data from app.settings where id = 1),
    'hours', app.hours_json());
end $$;

create or replace function api.admin_bookings(p_token text, p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = app, public as $$
begin
  perform app.require_admin(p_token);
  return coalesce((select jsonb_agg(app.booking_json(b) order by b.date, b.time) from app.bookings b
    where b.date between p_from and p_to), '[]'::jsonb);
end $$;

create or replace function api.admin_set_status(p_token text, p_id uuid, p_status text, p_notes text) returns jsonb
language plpgsql security definer set search_path = app, public as $$
declare
  b app.bookings;
begin
  perform app.require_admin(p_token);
  if p_status not in ('pending_payment','payment_review','paid','confirmed','completed','no_show','cancelled','rejected') then
    raise exception 'Estado no válido.';
  end if;
  perform pg_advisory_xact_lock(20261124);
  select * into b from app.bookings where id = p_id for update;
  if not found then raise exception 'No encontramos el turno.'; end if;
  if not app.is_busy(b.status, b.created_at) and p_status in ('payment_review','paid','confirmed') then
    perform app.assert_slot_free(b.date, b.time, b.duration_min, b.id);
  end if;
  update app.bookings set status = p_status, admin_notes = coalesce(p_notes, admin_notes) where id = p_id returning * into b;
  return app.booking_json(b);
end $$;

create or replace function api.admin_record_payment(p_token text, p_id uuid, p_amount integer, p_method text, p_kind text) returns jsonb
language plpgsql security definer set search_path = app, public as $$
declare
  b app.bookings;
begin
  perform app.require_admin(p_token);
  if coalesce(p_amount, 0) <= 0 then raise exception 'Ingresá un importe mayor a cero.'; end if;
  if p_method not in ('transfer','mercadopago','cash','simulated','other') then raise exception 'Elegí el medio de pago.'; end if;
  if p_kind not in ('deposit','balance') then raise exception 'Tipo de cobro no válido.'; end if;
  insert into app.payments (booking_id, amount, method, kind) values (p_id, p_amount, p_method, p_kind);
  update app.bookings set paid_amount = paid_amount + p_amount,
    deposit_method = case when p_kind = 'deposit' then p_method else deposit_method end,
    balance_method = case when p_kind = 'balance' then p_method else balance_method end,
    status = case when p_kind = 'deposit' and status in ('pending_payment','payment_review') then 'paid' else status end
  where id = p_id returning * into b;
  if not found then raise exception 'No encontramos el turno.'; end if;
  return app.booking_json(b);
end $$;

create or replace function api.admin_mark_reminded(p_token text, p_id uuid) returns jsonb
language plpgsql security definer set search_path = app, public as $$
declare
  b app.bookings;
begin
  perform app.require_admin(p_token);
  update app.bookings set reminded_at = now() where id = p_id returning * into b;
  return app.booking_json(b);
end $$;

create or replace function api.admin_create_booking(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = app, public as $$
begin
  perform app.require_admin(p_token);
  return app.booking_json(app.make_booking(p, true));
end $$;

create or replace function api.admin_reschedule(p_token text, p_id uuid, p_date date, p_time time) returns jsonb
language plpgsql security definer set search_path = app, public as $$
declare
  b app.bookings;
begin
  perform app.require_admin(p_token);
  perform pg_advisory_xact_lock(20261124);
  select * into b from app.bookings where id = p_id for update;
  if not found then raise exception 'No encontramos el turno.'; end if;
  perform app.assert_slot_free(p_date, p_time, b.duration_min, b.id);
  update app.bookings set date = p_date, time = p_time, reminded_at = null where id = p_id returning * into b;
  return app.booking_json(b);
end $$;

create or replace function api.admin_delete_booking(p_token text, p_id uuid) returns void
language plpgsql security definer set search_path = app, public as $$
begin
  perform app.require_admin(p_token);
  delete from app.bookings where id = p_id;
end $$;

create or replace function app.client_rows() returns table (
  phone_key text, name text, phone text, instagram text, notes text, birthday text,
  visits bigint, no_shows bigint, cancellations bigint, total_spent bigint, first_visit date, last_visit date
) language sql stable as $$
  with keys as (
    select b.phone_key from app.bookings b union select c.phone_key from app.clients c
  ), agg as (
    select b.phone_key,
      (array_agg(b.client_name order by b.created_at desc))[1] as last_name,
      (array_agg(b.phone order by b.created_at desc))[1] as last_phone,
      (array_agg(b.instagram order by b.created_at desc) filter (where b.instagram is not null))[1] as last_ig,
      count(*) filter (where b.status = 'completed') as visits,
      count(*) filter (where b.status = 'no_show') as no_shows,
      count(*) filter (where b.status = 'cancelled') as cancellations,
      coalesce(sum(b.paid_amount) filter (where b.status = 'completed'), 0) as total_spent,
      min(b.date) filter (where b.status = 'completed') as first_visit,
      max(b.date) filter (where b.status = 'completed') as last_visit
    from app.bookings b group by b.phone_key
  )
  select k.phone_key, coalesce(c.name, a.last_name, ''), coalesce(a.last_phone, k.phone_key),
    coalesce(c.instagram, a.last_ig), c.notes, c.birthday,
    coalesce(a.visits, 0), coalesce(a.no_shows, 0), coalesce(a.cancellations, 0), coalesce(a.total_spent, 0),
    a.first_visit, a.last_visit
  from keys k left join agg a on a.phone_key = k.phone_key left join app.clients c on c.phone_key = k.phone_key
$$;

create or replace function app.client_json(r record) returns jsonb
language plpgsql stable as $$
declare
  nb app.bookings;
begin
  select * into nb from app.bookings b where b.phone_key = r.phone_key and b.date >= app.local_now()::date
    and b.status in ('pending_payment','payment_review','paid','confirmed') order by b.date, b.time limit 1;
  return jsonb_strip_nulls(jsonb_build_object(
    'phone', r.phone, 'name', r.name, 'instagram', r.instagram, 'notes', r.notes, 'birthday', r.birthday,
    'visits', r.visits, 'noShows', r.no_shows, 'cancellations', r.cancellations, 'totalSpent', r.total_spent,
    'firstVisit', to_char(r.first_visit, 'YYYY-MM-DD'), 'lastVisit', to_char(r.last_visit, 'YYYY-MM-DD'),
    'nextBooking', case when nb.id is not null then jsonb_build_object('id', nb.id, 'date', to_char(nb.date, 'YYYY-MM-DD'),
      'time', to_char(nb.time, 'HH24:MI'), 'serviceName', nb.service_name) end));
end $$;

create or replace function api.admin_clients(p_token text, p_search text) returns jsonb
language plpgsql stable security definer set search_path = app, public as $$
declare
  q text := lower(btrim(coalesce(p_search, '')));
begin
  perform app.require_admin(p_token);
  return coalesce((select jsonb_agg(app.client_json(r) order by r.last_visit desc nulls last, r.name)
    from app.client_rows() r
    where q = '' or lower(r.name) like '%' || q || '%' or r.phone_key like '%' || regexp_replace(q, '\D', '', 'g') || '%'
      and regexp_replace(q, '\D', '', 'g') <> '' or lower(coalesce(r.instagram, '')) like '%' || q || '%'), '[]'::jsonb);
end $$;

create or replace function api.admin_client(p_token text, p_phone text) returns jsonb
language plpgsql stable security definer set search_path = app, public as $$
declare
  k text := app.phone_key(p_phone);
  r record;
begin
  perform app.require_admin(p_token);
  select * into r from app.client_rows() c where c.phone_key = k;
  if not found then return null; end if;
  return jsonb_build_object('client', app.client_json(r),
    'bookings', coalesce((select jsonb_agg(app.booking_json(b) order by b.date desc, b.time desc) from app.bookings b where b.phone_key = k), '[]'::jsonb));
end $$;

create or replace function api.admin_save_client(p_token text, p_phone text, p jsonb) returns void
language plpgsql security definer set search_path = app, public as $$
begin
  perform app.require_admin(p_token);
  insert into app.clients (phone_key, name, instagram, notes, birthday)
  values (app.phone_key(p_phone), p->>'name', p->>'instagram', p->>'notes', p->>'birthday')
  on conflict (phone_key) do update set
    name = coalesce(excluded.name, app.clients.name),
    instagram = coalesce(excluded.instagram, app.clients.instagram),
    notes = case when p ? 'notes' then excluded.notes else app.clients.notes end,
    birthday = case when p ? 'birthday' then excluded.birthday else app.clients.birthday end;
end $$;

create or replace function api.admin_stats(p_token text, p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = app, public as $$
begin
  perform app.require_admin(p_token);
  return (
    with b as (select * from app.bookings where date between p_from and p_to),
    pay as (select p.* from app.payments p where (p.created_at at time zone 'America/Argentina/Buenos_Aires')::date between p_from and p_to)
    select jsonb_build_object(
      'from', to_char(p_from, 'YYYY-MM-DD'), 'to', to_char(p_to, 'YYYY-MM-DD'),
      'bookings', (select count(*) from b where status not in ('cancelled', 'rejected')),
      'completed', (select count(*) from b where status = 'completed'),
      'noShows', (select count(*) from b where status = 'no_show'),
      'cancelled', (select count(*) from b where status = 'cancelled'),
      'revenue', (select coalesce(sum(paid_amount), 0) from b where status = 'completed'),
      'depositsCollected', (select coalesce(sum(amount), 0) from pay where kind = 'deposit'),
      'expected', (select coalesce(sum(total), 0) from b where status in ('pending_payment', 'payment_review', 'paid', 'confirmed')),
      'newClients', (select count(*) from (select phone_key, min(date) d from app.bookings where status = 'completed' group by phone_key) f where f.d between p_from and p_to),
      'byService', coalesce((select jsonb_agg(x order by (x->>'count')::int desc) from (
          select jsonb_build_object('serviceId', service_id, 'name', max(service_name), 'count', count(*),
            'revenue', coalesce(sum(paid_amount) filter (where status = 'completed'), 0)) x
          from b where status not in ('cancelled', 'rejected') group by service_id) s), '[]'::jsonb),
      'byDay', coalesce((select jsonb_agg(x order by x->>'date') from (
          select jsonb_build_object('date', to_char(date, 'YYYY-MM-DD'), 'count', count(*),
            'revenue', coalesce(sum(paid_amount) filter (where status = 'completed'), 0)) x
          from b where status not in ('cancelled', 'rejected') group by date) d), '[]'::jsonb),
      'byMethod', coalesce((select jsonb_agg(jsonb_build_object('method', method, 'amount', total)) from (
          select method, sum(amount) total from pay group by method) m), '[]'::jsonb),
      'topDesigns', coalesce((select jsonb_agg(x order by (x->>'count')::int desc) from (
          select jsonb_build_object('name', design_name, 'count', count(*)) x
          from b where design_name is not null and status not in ('cancelled', 'rejected') group by design_name limit 8) t), '[]'::jsonb)
    ));
end $$;

create or replace function api.admin_waitlist(p_token text) returns jsonb
language plpgsql stable security definer set search_path = app, public as $$
begin
  perform app.require_admin(p_token);
  return coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', w.id, 'createdAt', w.created_at, 'name', w.name,
    'phone', w.phone, 'serviceId', w.service_id, 'serviceName', s.name, 'preferred', w.preferred, 'status', w.status))
    order by w.created_at desc) from app.waitlist w left join app.services s on s.id = w.service_id), '[]'::jsonb);
end $$;

create or replace function api.admin_waitlist_status(p_token text, p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = app, public as $$
begin
  perform app.require_admin(p_token);
  update app.waitlist set status = p_status where id = p_id;
end $$;

create or replace function api.admin_waitlist_delete(p_token text, p_id uuid) returns void
language plpgsql security definer set search_path = app, public as $$
begin
  perform app.require_admin(p_token);
  delete from app.waitlist where id = p_id;
end $$;

create or replace function api.admin_save_design(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = app, public as $$
declare
  d app.designs;
begin
  perform app.require_admin(p_token);
  insert into app.designs (id, name, description, tags, photo_url, render_url, params, service_id, active, sort)
  values (p->>'id', p->>'name', p->>'description', array(select jsonb_array_elements_text(coalesce(p->'tags', '[]'::jsonb))),
    p->>'photoUrl', p->>'renderUrl', coalesce(p->'params', '{}'::jsonb), p->>'serviceId',
    coalesce((p->>'active')::boolean, true), coalesce((p->>'sort')::integer, 0))
  on conflict (id) do update set name = excluded.name, description = excluded.description, tags = excluded.tags,
    photo_url = excluded.photo_url, render_url = excluded.render_url, params = excluded.params,
    service_id = excluded.service_id, active = excluded.active, sort = excluded.sort
  returning * into d;
  return app.design_json(d);
end $$;

create or replace function api.admin_delete_design(p_token text, p_id text) returns void
language plpgsql security definer set search_path = app, public as $$
begin
  perform app.require_admin(p_token);
  delete from app.designs where id = p_id;
end $$;

create or replace function api.admin_save_service(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = app, public as $$
declare
  s app.services;
begin
  perform app.require_admin(p_token);
  insert into app.services (id, name, description, price, price_from, duration_min, active, sort)
  values (p->>'id', p->>'name', p->>'description', (p->>'price')::integer, coalesce((p->>'priceFrom')::boolean, false),
    (p->>'durationMin')::integer, coalesce((p->>'active')::boolean, true), coalesce((p->>'sort')::integer, 0))
  on conflict (id) do update set name = excluded.name, description = excluded.description, price = excluded.price,
    price_from = excluded.price_from, duration_min = excluded.duration_min, active = excluded.active, sort = excluded.sort
  returning * into s;
  return app.service_json(s);
end $$;

create or replace function api.admin_delete_service(p_token text, p_id text) returns void
language plpgsql security definer set search_path = app, public as $$
begin
  perform app.require_admin(p_token);
  delete from app.services where id = p_id;
end $$;

create or replace function api.admin_save_extra(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = app, public as $$
declare
  e app.extras;
begin
  perform app.require_admin(p_token);
  insert into app.extras (id, name, price, mode, max_qty, active, sort)
  values (p->>'id', p->>'name', (p->>'price')::integer, p->>'mode', coalesce((p->>'maxQty')::integer, 1),
    coalesce((p->>'active')::boolean, true), coalesce((p->>'sort')::integer, 0))
  on conflict (id) do update set name = excluded.name, price = excluded.price, mode = excluded.mode,
    max_qty = excluded.max_qty, active = excluded.active, sort = excluded.sort
  returning * into e;
  return app.extra_json(e);
end $$;

create or replace function api.admin_delete_extra(p_token text, p_id text) returns void
language plpgsql security definer set search_path = app, public as $$
begin
  perform app.require_admin(p_token);
  delete from app.extras where id = p_id;
end $$;

create or replace function api.admin_save_hours(p_token text, p jsonb) returns void
language plpgsql security definer set search_path = app, public as $$
begin
  perform app.require_admin(p_token);
  insert into app.working_hours (weekday, enabled, start, "end")
  select (h->>'weekday')::integer, (h->>'enabled')::boolean, (h->>'start')::time, (h->>'end')::time
  from jsonb_array_elements(p) h
  on conflict (weekday) do update set enabled = excluded.enabled, start = excluded.start, "end" = excluded."end";
end $$;

create or replace function api.admin_add_blocked(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = app, public as $$
declare
  r app.blocked_slots;
begin
  perform app.require_admin(p_token);
  insert into app.blocked_slots (date, start, "end", reason)
  values ((p->>'date')::date, nullif(p->>'start', '')::time, nullif(p->>'end', '')::time, nullif(p->>'reason', ''))
  returning * into r;
  return jsonb_strip_nulls(jsonb_build_object('id', r.id, 'date', to_char(r.date, 'YYYY-MM-DD'),
    'start', to_char(r.start, 'HH24:MI'), 'end', to_char(r."end", 'HH24:MI'), 'reason', r.reason));
end $$;

create or replace function api.admin_remove_blocked(p_token text, p_id uuid) returns void
language plpgsql security definer set search_path = app, public as $$
begin
  perform app.require_admin(p_token);
  delete from app.blocked_slots where id = p_id;
end $$;

create or replace function api.admin_save_settings(p_token text, p jsonb) returns void
language plpgsql security definer set search_path = app, public as $$
begin
  perform app.require_admin(p_token);
  if jsonb_typeof(p) <> 'object' or p->>'paymentsMode' not in ('simulated', 'manual') then
    raise exception 'Revisá los ajustes.';
  end if;
  insert into app.settings (id, data) values (1, p) on conflict (id) do update set data = excluded.data;
end $$;

-- ------------------------------------------------ permisos del rol web
do $$
begin
  if exists (select from pg_roles where rolname = 'studio_web') then
    execute 'grant usage on schema api to studio_web';
    execute 'grant execute on all functions in schema api to studio_web';
    execute 'revoke all on schema app from studio_web';
    execute 'alter role studio_web set statement_timeout = ''8s''';
    execute 'alter role studio_web set idle_in_transaction_session_timeout = ''10s''';
  end if;
end $$;
revoke execute on all functions in schema app from public;
