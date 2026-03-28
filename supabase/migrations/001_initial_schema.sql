-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users profile table (extends Supabase Auth)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  nickname text,
  avatar_url text,
  provider text,
  created_at timestamptz default now() not null,
  last_login_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Sessions table
create table public.sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  service_type text not null check (service_type in ('tarot', 'saju', 'shinjeom', 'fortune')),
  topic text not null check (topic in ('love', 'finance', 'career', 'health', 'general')),
  spread_type text not null check (spread_type in ('one-card', 'three-card', 'five-card')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  created_at timestamptz default now() not null,
  completed_at timestamptz
);

alter table public.sessions enable row level security;

create policy "Users can view own sessions" on public.sessions for select using (auth.uid() = user_id);
create policy "Anyone can create sessions" on public.sessions for insert with check (true);
create policy "Users can update own sessions" on public.sessions for update using (auth.uid() = user_id or user_id is null);

-- Session cards table
create table public.session_cards (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  card_id text not null,
  position integer not null,
  is_reversed boolean default false not null,
  selected_at timestamptz default now() not null
);

alter table public.session_cards enable row level security;

create policy "Cards follow session access" on public.session_cards for select
  using (exists (select 1 from public.sessions s where s.id = session_id and (s.user_id = auth.uid() or s.user_id is null)));
create policy "Anyone can insert cards" on public.session_cards for insert with check (true);

-- Readings table
create table public.readings (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null unique,
  card_interpretation jsonb not null default '[]'::jsonb,
  overall_reading text not null default '',
  advice text not null default '',
  share_token text unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz default now() not null
);

alter table public.readings enable row level security;

create policy "Readings viewable by session owner" on public.readings for select
  using (exists (select 1 from public.sessions s where s.id = session_id and (s.user_id = auth.uid() or s.user_id is null)));
create policy "Readings viewable by share token" on public.readings for select using (true);
create policy "Anyone can insert readings" on public.readings for insert with check (true);

-- Services registry
create table public.services (
  id text primary key,
  name text not null,
  is_active boolean default true not null,
  character_config jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

alter table public.services enable row level security;
create policy "Services are publicly readable" on public.services for select using (true);

insert into public.services (id, name, is_active) values
  ('tarot', '타로', true), ('saju', '사주', false),
  ('shinjeom', '신점', false), ('fortune', '오늘의 운세', false);

-- Indexes
create index idx_sessions_user_id on public.sessions(user_id);
create index idx_sessions_status on public.sessions(status);
create index idx_readings_share_token on public.readings(share_token);
create index idx_session_cards_session_id on public.session_cards(session_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, nickname, avatar_url, provider)
  values (new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'provider');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();
