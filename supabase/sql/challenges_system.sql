-- ============================================================
-- INSIDERS — Challenges hebdo (Session C-1)
-- ============================================================

-- 1. Table challenges
create table if not exists public.challenges (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  description text,
  rules       jsonb not null,
  -- ex: {"sport":"tennis","metric":"roi","minBets":5,"surface":"hard"}
  rewards     jsonb not null default '{"1":200,"2":100,"3":50}'::jsonb,
  -- ex: {"1":200,"2":100,"3":50} = top 1 gagne 200, top 2 gagne 100, top 3 gagne 50 crédits
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  status      text not null default 'active',
  -- 'active' | 'computed' | 'archived'
  created_at  timestamptz default now() not null
);

create index if not exists challenges_active_idx on public.challenges(status, ends_at desc);

alter table public.challenges enable row level security;

-- Tout le monde peut lire les challenges (publics)
drop policy if exists "challenges_read_all" on public.challenges;
create policy "challenges_read_all"
  on public.challenges for select
  using (true);

-- Personne ne peut modifier côté client (admin only)
-- Les insertions et updates se font via service_role uniquement.

-- 2. Table challenge_participants — résultat calculé pour un user dans un challenge
create table if not exists public.challenge_participants (
  challenge_id  uuid not null references public.challenges(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  bets_count    integer not null default 0,
  metric_value  numeric not null default 0,  -- ROI, profit, ou autre selon le challenge
  rank          integer,                      -- rempli après calcul final
  reward_credits integer default 0,           -- crédits attribués (post-calcul)
  computed_at   timestamptz,                  -- timestamp du dernier calcul
  primary key (challenge_id, user_id)
);

create index if not exists cp_challenge_idx on public.challenge_participants(challenge_id, rank);
create index if not exists cp_user_idx on public.challenge_participants(user_id);

alter table public.challenge_participants enable row level security;

-- Tout le monde peut voir le leaderboard d'un challenge
drop policy if exists "cp_read_all" on public.challenge_participants;
create policy "cp_read_all"
  on public.challenge_participants for select
  using (true);

-- 3. Insère le PREMIER challenge actif (Cette semaine)
-- → Tu peux modifier title/description/dates pour le challenge en cours
insert into public.challenges (title, description, rules, rewards, starts_at, ends_at)
values (
  'Tennis Master',
  'Cette semaine : qui aura le meilleur ROI sur 5 paris tennis minimum ?',
  '{"sport":"tennis","metric":"roi","minBets":5}'::jsonb,
  '{"1":200,"2":100,"3":50}'::jsonb,
  date_trunc('week', now()),
  date_trunc('week', now()) + interval '7 days'
)
on conflict do nothing;

-- ============================================================
-- VERIFICATION
-- ============================================================
-- select id, title, starts_at, ends_at, status from public.challenges;
-- → tu dois voir 1 challenge "Tennis Master"
