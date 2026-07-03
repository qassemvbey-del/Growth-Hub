-- Profiles table
create table if not exists profiles (
  user_id uuid references auth.users not null primary key,
  language_pref text check (language_pref in ('English', 'Standard Arabic', 'Egyptian Arabic')),
  theme_pref text check (theme_pref in ('Neon Cyberpunk', 'Clean Stealth')),
  ai_persona text check (ai_persona in ('Supportive AI', 'Aggressive Coach')),
  has_completed_tour boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Cups table
create table if not exists cups (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  status text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tasks table
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  cup_id uuid references cups not null,
  parent_id uuid references tasks,
  title text not null,
  type text not null,
  is_completed boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table profiles enable row level security;
alter table cups enable row level security;
alter table tasks enable row level security;

-- RLS Policies
create policy "Users can view their own profile" on profiles for select using (auth.uid() = user_id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = user_id);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = user_id);

create policy "Users can view their own cups" on cups for select using (auth.uid() = user_id);
create policy "Users can insert their own cups" on cups for insert with check (auth.uid() = user_id);
create policy "Users can update their own cups" on cups for update using (auth.uid() = user_id);

create policy "Users can view tasks of their own cups" on tasks for select using (
  exists (select 1 from cups where cups.id = tasks.cup_id and cups.user_id = auth.uid())
);
create policy "Users can insert tasks into their own cups" on tasks for insert with check (
  exists (select 1 from cups where cups.id = tasks.cup_id and cups.user_id = auth.uid())
);
create policy "Users can update tasks of their own cups" on tasks for update using (
  exists (select 1 from cups where cups.id = tasks.cup_id and cups.user_id = auth.uid())
);

-- Task Progress table
create table if not exists task_progress (
  task_id text not null,
  user_id uuid references auth.users(id) not null,
  video_time integer default 0,
  video_duration integer default 0,
  updated_at timestamp with time zone default now(),
  primary key (task_id, user_id)
);

-- Enable RLS for task_progress
alter table task_progress enable row level security;

-- Policies for task_progress
create policy "Users manage own progress" on task_progress
  for all using (auth.uid() = user_id);

-- Goal Members roles update
ALTER TABLE goal_members 
ADD COLUMN IF NOT EXISTS role text 
DEFAULT 'member' 
CHECK (role IN ('owner','admin','member','viewer','guest'));

UPDATE goal_members 
SET role = 'admin' 
WHERE role = 'co-admin';

-- Squad Join Requests role update
ALTER TABLE squad_join_requests 
ADD COLUMN IF NOT EXISTS role text 
DEFAULT 'member';

-- Inbox Reports table
create table if not exists inbox_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  type text not null,
  content jsonb default '{}'::jsonb not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint inbox_reports_type_check check (
    type in (
      'daily_brief',
      'deadline_alert',
      'mission_complete',
      'weekly_review',
      'squad_join_request',
      'squad_join_approved',
      'squad_join_rejected',
      'squad_request',
      'squad_accept',
      'squad_reject',
      'squad_promote',
      'squad_demote',
      'custom_alert',
      'rank_up',
      'squad_invite',
      'system',
      'squad_request_pending',
      'join_approved',
      'join_rejected',
      'squad_member_joined',
      'squad_member_left'
    )
  )
);

-- Enable RLS for inbox_reports
alter table inbox_reports enable row level security;

-- RLS Policies for inbox_reports
create policy "Users can view their own inbox reports" on inbox_reports
  for select using (auth.uid() = user_id);

create policy "Users can update their own inbox reports" on inbox_reports
  for update using (auth.uid() = user_id);

create policy "System/Admins can insert inbox reports" on inbox_reports
  for insert with check (true);

-- Push Subscriptions table
create table if not exists push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  subscription jsonb not null,
  device text default 'desktop',
  created_at timestamptz default now(),
  constraint push_subscriptions_device_check check (device in ('desktop', 'mobile')),
  unique(user_id, device)
);

-- Enable RLS for push_subscriptions
alter table push_subscriptions enable row level security;

-- RLS Policies for push_subscriptions
create policy "Users manage own subscriptions"
  on push_subscriptions for all using (auth.uid() = user_id);


