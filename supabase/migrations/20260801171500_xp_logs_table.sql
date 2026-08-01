-- Migration: create xp_logs table for detailed XP activity tracking
create table if not exists public.xp_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  amount integer not null,
  base_amount integer not null,
  reason text not null,
  reason_code text not null,
  task_id uuid references tasks(id) on delete set null,
  created_at timestamptz default now() not null
);

create index if not exists xp_logs_user_id_created_at_idx on public.xp_logs (user_id, created_at desc);
create index if not exists xp_logs_task_id_idx on public.xp_logs (task_id);

alter table public.xp_logs enable row level security;

create policy "Users can view their own XP logs" on public.xp_logs
  for select to authenticated using (auth.uid() = user_id);

create policy "Users can insert their own XP logs" on public.xp_logs
  for insert to authenticated with check (auth.uid() = user_id);

-- Grant privileges for Data API / REST
grant select, insert on public.xp_logs to authenticated;
