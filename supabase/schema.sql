-- SkillSphere optional cloud database schema.
-- Run this in Supabase SQL Editor. Demo mode works without Supabase.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  handle text unique,
  role text default '',
  location text default '',
  bio text default '',
  avatar text default '',
  skill_level text default 'Beginner',
  session_format text default 'Both',
  availability text[] default '{}',
  interests text[] default '{}',
  verified boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_name text not null,
  skill_type text not null check (skill_type in ('teach','learn')),
  proficiency text default 'Beginner',
  created_at timestamptz default now()
);

create table if not exists public.exchanges (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id),
  partner_id uuid not null references public.profiles(id),
  skill_name text not null,
  preferred_time text,
  status text not null default 'Pending' check (status in ('Pending','Confirmed','Completed','Cancelled')),
  created_at timestamptz default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  exchange_id uuid not null references public.exchanges(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  reviewee_id uuid not null references public.profiles(id),
  rating int not null check (rating between 1 and 5),
  note text default '',
  created_at timestamptz default now(),
  unique(exchange_id, reviewer_id)
);

create table if not exists public.learning_artifacts (
  id uuid primary key default gen_random_uuid(),
  exchange_id uuid not null references public.exchanges(id) on delete cascade,
  owner_id uuid not null references public.profiles(id),
  title text not null,
  description text default '',
  artifact_url text,
  milestone_status text default 'In progress',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.exchanges enable row level security;
alter table public.reviews enable row level security;
alter table public.learning_artifacts enable row level security;

create policy "Profiles are viewable by authenticated users" on public.profiles for select to authenticated using (true);
create policy "Users can insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Skills are viewable by authenticated users" on public.skills for select to authenticated using (true);
create policy "Users manage own skills" on public.skills for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Participants can view exchanges" on public.exchanges for select to authenticated using (auth.uid() = requester_id or auth.uid() = partner_id);
create policy "Users can request exchanges" on public.exchanges for insert to authenticated with check (auth.uid() = requester_id);
create policy "Participants can update exchanges" on public.exchanges for update to authenticated using (auth.uid() = requester_id or auth.uid() = partner_id);
create policy "Reviews visible to authenticated users" on public.reviews for select to authenticated using (true);
create policy "Reviewer can create review" on public.reviews for insert to authenticated with check (auth.uid() = reviewer_id);
create policy "Artifacts visible to participants" on public.learning_artifacts for select to authenticated using (
  exists (select 1 from public.exchanges e where e.id = exchange_id and (e.requester_id = auth.uid() or e.partner_id = auth.uid()))
);
create policy "Owner can manage artifacts" on public.learning_artifacts for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Create a profile row automatically after signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, handle)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'New member'),
          coalesce(new.raw_user_meta_data->>'handle', 'member-' || substr(new.id::text,1,8)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();
