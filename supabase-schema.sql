-- ====================================================================
-- SCHEMA DATABASE SUPABASE CHO HỆ THỐNG BỐC BÁT HỌ & QUẢN LÝ HỤI
-- Hướng dẫn: Copy toàn bộ nội dung file này dán vào Supabase SQL Editor
-- rồi nhấn "RUN" (chạy 1 lần duy nhất) là kết nối thành công 100%!
-- ====================================================================

-- 1. BẢNG DÂY HỤI / HỌ XOAY VÒNG
create table if not exists public.hui_groups (
  id text primary key,
  name text not null,
  amount_per_slot bigint not null,
  total_slots int not null,
  cycle text not null,
  commission_per_period bigint not null default 0,
  start_date text not null,
  status text not null default 'ACTIVE',
  slots jsonb not null default '[]'::jsonb,
  periods jsonb not null default '[]'::jsonb,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. BẢNG BÁT HỌ NGÀY (VAY GÓP 10 ĂN 8)
create table if not exists public.bat_ho_loans (
  id text primary key,
  customer_name text not null,
  phone text,
  address text,
  start_date text not null,
  total_amount bigint not null,
  received_amount bigint not null,
  cut_fee bigint not null,
  total_days int not null default 50,
  daily_amount bigint not null,
  status text not null default 'ACTIVE',
  payments jsonb not null default '[]'::jsonb,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. CẤP QUYỀN TRUY CẬP (GRANT) CHO ROLE anon VÀ authenticated
-- (Rất quan trọng: Nếu thiếu lệnh này PostgREST sẽ báo lỗi 42501 permission denied)
grant usage on schema public to anon, authenticated;
grant all on table public.hui_groups to anon, authenticated;
grant all on table public.bat_ho_loans to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;

-- 4. KÍCH HOẠT ROW LEVEL SECURITY (RLS) & CHÍNH SÁCH MỞ (PUBLIC ACCESS)
alter table public.hui_groups enable row level security;
alter table public.bat_ho_loans enable row level security;

-- Xóa các policy cũ để tránh trùng lặp
drop policy if exists "Allow public all hui_groups" on public.hui_groups;
drop policy if exists "Allow public read hui_groups" on public.hui_groups;
drop policy if exists "Allow public insert hui_groups" on public.hui_groups;
drop policy if exists "Allow public update hui_groups" on public.hui_groups;
drop policy if exists "Allow public delete hui_groups" on public.hui_groups;

-- Cấp toàn quyền CRUD cho hui_groups
create policy "Allow public all hui_groups" on public.hui_groups
  for all
  using (true)
  with check (true);

-- Xóa các policy cũ của bat_ho_loans
drop policy if exists "Allow public all bat_ho_loans" on public.bat_ho_loans;
drop policy if exists "Allow public read bat_ho_loans" on public.bat_ho_loans;
drop policy if exists "Allow public insert bat_ho_loans" on public.bat_ho_loans;
drop policy if exists "Allow public update bat_ho_loans" on public.bat_ho_loans;
drop policy if exists "Allow public delete bat_ho_loans" on public.bat_ho_loans;

-- Cấp toàn quyền CRUD cho bat_ho_loans
create policy "Allow public all bat_ho_loans" on public.bat_ho_loans
  for all
  using (true)
  with check (true);

-- 5. KÍCH HOẠT REALTIME ĐỂ MỌI MÁY ĐỒNG BỘ TỨC THÌ (AN TOÀN NẾU CHẠY LẠI NHIỀU LẦN)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'hui_groups'
  ) then
    alter publication supabase_realtime add table public.hui_groups;
  end if;
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bat_ho_loans'
  ) then
    alter publication supabase_realtime add table public.bat_ho_loans;
  end if;
end $$;

-- 6. TẠO BUCKET LƯU MÃ QR (SUPABASE STORAGE) VÀ MỞ QUYỀN PUBLIC CHO ẢNH
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'qr-codes',
  'qr-codes',
  true,
  5242880, -- Giới hạn 5MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Policy cho phép đọc, tải lên và cập nhật ảnh trong bucket qr-codes
drop policy if exists "Allow public read qr-codes" on storage.objects;
create policy "Allow public read qr-codes"
  on storage.objects for select
  using (bucket_id = 'qr-codes');

drop policy if exists "Allow public insert qr-codes" on storage.objects;
create policy "Allow public insert qr-codes"
  on storage.objects for insert
  with check (bucket_id = 'qr-codes');

drop policy if exists "Allow public update qr-codes" on storage.objects;
create policy "Allow public update qr-codes"
  on storage.objects for update
  using (bucket_id = 'qr-codes');

drop policy if exists "Allow public delete qr-codes" on storage.objects;
create policy "Allow public delete qr-codes"
  on storage.objects for delete
  using (bucket_id = 'qr-codes');

-- 7. BẢNG GHI NHẬN LƯỢT TRUY CẬP (ACCESS LOGS)
create table if not exists public.access_logs (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  location_display text,
  city text,
  region text,
  country text,
  device text,
  os text,
  browser text,
  screen text,
  path text,
  user_agent text,
  created_at timestamptz default now()
);

grant all on table public.access_logs to anon, authenticated;
alter table public.access_logs enable row level security;

drop policy if exists "Allow public insert access_logs" on public.access_logs;
drop policy if exists "Allow public select access_logs" on public.access_logs;

create policy "Allow public insert access_logs" on public.access_logs
  for insert
  with check (true);

create policy "Allow public select access_logs" on public.access_logs
  for select
  using (true);


-- 8. BẢNG CHIA TIỀN NHÓM (ĐI ĂN, ĐI CHƠI)
create table if not exists public.split_events (
  id text primary key,
  name text not null,
  event_date text not null,
  members jsonb not null default '[]'::jsonb,
  expenses jsonb not null default '[]'::jsonb,
  paid_transfers jsonb not null default '[]'::jsonb,
  status text not null default 'ACTIVE',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

grant all on table public.split_events to anon, authenticated;
alter table public.split_events enable row level security;

drop policy if exists "Allow public all split_events" on public.split_events;
create policy "Allow public all split_events" on public.split_events
  for all
  using (true)
  with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'split_events'
  ) then
    alter publication supabase_realtime add table public.split_events;
  end if;
end $$;
