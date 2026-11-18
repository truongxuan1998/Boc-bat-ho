-- ====================================================================
-- SCHEMA DATABASE SUPABASE CHO HỆ THỐNG BỐC BÁT HỌ & QUẢN LÝ HỤI
-- Hướng dẫn: Copy toàn bộ nội dung file này dán vào Supabase SQL Editor
-- rồi nhấn "RUN" là xong 100%!
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

-- 3. KÍCH HOẠT ROW LEVEL SECURITY (RLS) VÀ MỞ QUYỀN TRUY CẬP
alter table public.hui_groups enable row level security;
alter table public.bat_ho_loans enable row level security;

-- Policy cho phép đọc/ghi qua anon key (public)
drop policy if exists "Allow public read hui_groups" on public.hui_groups;
create policy "Allow public read hui_groups" on public.hui_groups for select using (true);

drop policy if exists "Allow public insert hui_groups" on public.hui_groups;
create policy "Allow public insert hui_groups" on public.hui_groups for insert with check (true);

drop policy if exists "Allow public update hui_groups" on public.hui_groups;
create policy "Allow public update hui_groups" on public.hui_groups for update using (true);

drop policy if exists "Allow public delete hui_groups" on public.hui_groups;
create policy "Allow public delete hui_groups" on public.hui_groups for delete using (true);

drop policy if exists "Allow public read bat_ho_loans" on public.bat_ho_loans;
create policy "Allow public read bat_ho_loans" on public.bat_ho_loans for select using (true);

drop policy if exists "Allow public insert bat_ho_loans" on public.bat_ho_loans;
create policy "Allow public insert bat_ho_loans" on public.bat_ho_loans for insert with check (true);

drop policy if exists "Allow public update bat_ho_loans" on public.bat_ho_loans;
create policy "Allow public update bat_ho_loans" on public.bat_ho_loans for update using (true);

drop policy if exists "Allow public delete bat_ho_loans" on public.bat_ho_loans;
create policy "Allow public delete bat_ho_loans" on public.bat_ho_loans for delete using (true);

-- 4. KÍCH HOẠT REALTIME ĐỂ MỌI MÁY ĐỒNG BỘ TỨC THÌ
alter publication supabase_realtime add table public.hui_groups;
alter publication supabase_realtime add table public.bat_ho_loans;
