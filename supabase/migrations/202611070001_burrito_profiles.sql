create table if not exists public.burrito_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Chicherito' check (char_length(display_name) between 1 and 18),
  color text not null default '#e86b5a',
  accessory text not null default 'pañuelo' check (accessory in ('pañuelo', 'sombrero', 'ninguno')),
  updated_at timestamptz not null default now()
);

create table if not exists public.burrito_campaign_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id text not null check (char_length(mission_id) between 1 and 64),
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, mission_id)
);

alter table public.burrito_profiles enable row level security;
alter table public.burrito_campaign_progress enable row level security;

drop policy if exists "profiles own row" on public.burrito_profiles;
create policy "profiles own row" on public.burrito_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "campaign progress own rows" on public.burrito_campaign_progress;
create policy "campaign progress own rows" on public.burrito_campaign_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
