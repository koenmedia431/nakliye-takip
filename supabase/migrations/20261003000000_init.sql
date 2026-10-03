-- Nakliye Takip: Firebase'den Supabase'e geçiş için temel şema
-- Kimlikler (id) Firestore belge kimlikleriyle uyumlu olsun diye text tutulur.

-- ===================== TABLOLAR =====================
create table public.companies (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  admin_uid uuid references auth.users (id) on delete set null,
  firebase_imported_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role text not null default 'driver' check (role in ('admin', 'driver')),
  company_id text references public.companies (id) on delete set null,
  vehicle_plate text,
  vehicle_id text,
  fuel_rate double precision,
  region text,
  firebase_uid text unique,
  created_at timestamptz not null default now()
);

create table public.vehicles (
  id text primary key default gen_random_uuid()::text,
  company_id text not null references public.companies (id) on delete cascade,
  plate text not null,
  brand text not null default '',
  model text not null default '',
  year integer,
  type text not null default 'diğer',
  fuel_type text not null default 'dizel',
  current_km double precision not null default 0,
  driver_uid uuid references public.profiles (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.trips (
  id text primary key default gen_random_uuid()::text,
  company_id text not null references public.companies (id) on delete cascade,
  vehicle_id text,
  vehicle_plate text not null default '',
  driver_uid uuid references public.profiles (id) on delete set null,
  driver_name text not null default '',
  region text,
  date text not null,
  start_time text,
  end_time text,
  departure_km double precision not null default 0,
  return_km double precision not null default 0,
  total_km double precision not null default 0,
  fuel_liters double precision,
  fuel_rate double precision,
  notes text,
  created_at timestamptz not null default now()
);

create table public.fuel_entries (
  id text primary key default gen_random_uuid()::text,
  company_id text not null references public.companies (id) on delete cascade,
  vehicle_id text,
  vehicle_plate text not null default '',
  driver_uid uuid references public.profiles (id) on delete set null,
  driver_name text not null default '',
  date text not null,
  liters double precision not null default 0,
  price_per_liter double precision not null default 0,
  total_cost double precision not null default 0,
  current_km double precision not null default 0,
  station text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.customers (
  id text primary key default gen_random_uuid()::text,
  company_id text not null references public.companies (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  tax_no text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.customer_tx (
  id text primary key default gen_random_uuid()::text,
  company_id text not null references public.companies (id) on delete cascade,
  customer_id text not null references public.customers (id) on delete cascade,
  kind text not null check (kind in ('borc', 'tahsilat', 'masraf')),
  amount numeric(14, 2) not null check (amount >= 0),
  description text not null default '',
  date text not null,
  message_id text,
  created_at timestamptz not null default now()
);

create table public.customer_messages (
  id text primary key default gen_random_uuid()::text,
  company_id text not null references public.companies (id) on delete cascade,
  customer_id text not null references public.customers (id) on delete cascade,
  text text not null,
  tx_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index on public.profiles (company_id);
create index on public.vehicles (company_id);
create index on public.vehicles (driver_uid);
create index on public.trips (company_id, date desc);
create index on public.trips (driver_uid);
create index on public.fuel_entries (company_id, date desc);
create index on public.fuel_entries (driver_uid);
create index on public.customers (company_id);
create index on public.customer_tx (company_id);
create index on public.customer_tx (customer_id);
create index on public.customer_messages (company_id);
create index on public.customer_messages (customer_id);
create index on public.companies (admin_uid);

-- ===================== YARDIMCI FONKSİYONLAR =====================
create function public.my_company_id() returns text
language sql stable security definer set search_path = ''
as $$ select company_id from public.profiles where id = (select auth.uid()) $$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select role = 'admin' from public.profiles where id = (select auth.uid())), false) $$;

revoke execute on function public.my_company_id() from anon;
revoke execute on function public.is_admin() from anon;

-- Yeni kullanıcı: metadata'da company_name varsa yeni şirket + yönetici,
-- company_id varsa o şirkete sürücü olarak eklenir.
-- Geçiş fonksiyonlarının oluşturduğu hesaplar (skip_profile) profili kendisi yazar.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_company text;
begin
  if meta ->> 'skip_profile' = 'true' then
    return new;
  end if;

  if coalesce(meta ->> 'company_name', '') <> '' then
    insert into public.companies (name, admin_uid)
    values (meta ->> 'company_name', new.id)
    returning id into v_company;
    insert into public.profiles (id, email, display_name, role, company_id)
    values (new.id, new.email, coalesce(meta ->> 'display_name', ''), 'admin', v_company);
  else
    select id into v_company from public.companies where id = meta ->> 'company_id';
    insert into public.profiles (id, email, display_name, role, company_id)
    values (new.id, new.email, coalesce(meta ->> 'display_name', ''), 'driver', v_company);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Kullanıcılar kendi rolünü / şirketini değiştiremez (sadece servis rolü)
create function public.protect_profile_fields() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role' and (
    new.role is distinct from old.role or
    new.company_id is distinct from old.company_id or
    new.firebase_uid is distinct from old.firebase_uid or
    new.email is distinct from old.email
  ) then
    raise exception 'Bu alanlar değiştirilemez';
  end if;
  return new;
end;
$$;

create trigger protect_profile_fields
before update on public.profiles
for each row execute function public.protect_profile_fields();

-- Sohbet mesajı + mesajdan çıkan kayıtları tek işlemde yazar (RLS geçerli)
create function public.add_customer_message(p_customer_id text, p_text text, p_entries jsonb)
returns text
language plpgsql security invoker set search_path = ''
as $$
declare
  v_company text;
  v_msg text := gen_random_uuid()::text;
  v_ids text[] := '{}';
  v_id text;
  e jsonb;
begin
  select company_id into v_company from public.customers where id = p_customer_id;
  if v_company is null then
    raise exception 'Müşteri bulunamadı';
  end if;
  for e in select * from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb)) loop
    insert into public.customer_tx (company_id, customer_id, kind, amount, description, date, message_id)
    values (v_company, p_customer_id, e ->> 'kind', (e ->> 'amount')::numeric, coalesce(e ->> 'description', ''), e ->> 'date', v_msg)
    returning id into v_id;
    v_ids := v_ids || v_id;
  end loop;
  insert into public.customer_messages (id, company_id, customer_id, text, tx_ids)
  values (v_msg, v_company, p_customer_id, p_text, v_ids);
  return v_msg;
end;
$$;

revoke execute on function public.add_customer_message(text, text, jsonb) from anon;

-- ===================== RLS =====================
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.trips enable row level security;
alter table public.fuel_entries enable row level security;
alter table public.customers enable row level security;
alter table public.customer_tx enable row level security;
alter table public.customer_messages enable row level security;

-- Şirket
create policy "companies_select" on public.companies for select to authenticated
  using (id = (select public.my_company_id()));
create policy "companies_update" on public.companies for update to authenticated
  using (id = (select public.my_company_id()) and (select public.is_admin()))
  with check (id = (select public.my_company_id()));

-- Profiller: aynı şirkettekiler görür; kişi kendini, yönetici şirket çalışanlarını günceller
create policy "profiles_select" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or company_id = (select public.my_company_id()));
create policy "profiles_update" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (company_id = (select public.my_company_id()) and (select public.is_admin())))
  with check (id = (select auth.uid()) or (company_id = (select public.my_company_id()) and (select public.is_admin())));

-- Araçlar: şirket okur, yönetici ekler/siler, herkes km günceller
create policy "vehicles_select" on public.vehicles for select to authenticated
  using (company_id = (select public.my_company_id()));
create policy "vehicles_insert" on public.vehicles for insert to authenticated
  with check (company_id = (select public.my_company_id()) and (select public.is_admin()));
create policy "vehicles_update" on public.vehicles for update to authenticated
  using (company_id = (select public.my_company_id()))
  with check (company_id = (select public.my_company_id()));
create policy "vehicles_delete" on public.vehicles for delete to authenticated
  using (company_id = (select public.my_company_id()) and (select public.is_admin()));

-- Seferler ve yakıt: şirket okur/ekler; yönetici veya kaydın sahibi düzenler
create policy "trips_select" on public.trips for select to authenticated
  using (company_id = (select public.my_company_id()));
create policy "trips_insert" on public.trips for insert to authenticated
  with check (company_id = (select public.my_company_id()));
create policy "trips_update" on public.trips for update to authenticated
  using (company_id = (select public.my_company_id()) and ((select public.is_admin()) or driver_uid = (select auth.uid())))
  with check (company_id = (select public.my_company_id()));
create policy "trips_delete" on public.trips for delete to authenticated
  using (company_id = (select public.my_company_id()) and ((select public.is_admin()) or driver_uid = (select auth.uid())));

create policy "fuel_select" on public.fuel_entries for select to authenticated
  using (company_id = (select public.my_company_id()));
create policy "fuel_insert" on public.fuel_entries for insert to authenticated
  with check (company_id = (select public.my_company_id()));
create policy "fuel_update" on public.fuel_entries for update to authenticated
  using (company_id = (select public.my_company_id()) and ((select public.is_admin()) or driver_uid = (select auth.uid())))
  with check (company_id = (select public.my_company_id()));
create policy "fuel_delete" on public.fuel_entries for delete to authenticated
  using (company_id = (select public.my_company_id()) and ((select public.is_admin()) or driver_uid = (select auth.uid())));

-- Müşteri cari: sadece yönetici
create policy "customers_admin" on public.customers for all to authenticated
  using (company_id = (select public.my_company_id()) and (select public.is_admin()))
  with check (company_id = (select public.my_company_id()) and (select public.is_admin()));
create policy "customer_tx_admin" on public.customer_tx for all to authenticated
  using (company_id = (select public.my_company_id()) and (select public.is_admin()))
  with check (company_id = (select public.my_company_id()) and (select public.is_admin()));
create policy "customer_messages_admin" on public.customer_messages for all to authenticated
  using (company_id = (select public.my_company_id()) and (select public.is_admin()))
  with check (company_id = (select public.my_company_id()) and (select public.is_admin()));

-- ===================== REALTIME =====================
alter publication supabase_realtime add table
  public.profiles, public.vehicles, public.trips, public.fuel_entries,
  public.customers, public.customer_tx, public.customer_messages;
