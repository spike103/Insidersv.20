-- ============================================================
-- INSIDERS — Pari communautaire + Battles 1v1 (Session D)
-- ============================================================

-- ============================================================
-- D-1 : PARI COMMUNAUTAIRE (publier un pick + voter)
-- ============================================================

-- 1. Table published_bets : un pari pending publié sur le mur communautaire
create table if not exists public.published_bets (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  bet_id       uuid not null references public.bets(id) on delete cascade,
  caption      text,
  votes_yes    integer not null default 0,
  votes_no     integer not null default 0,
  status       text not null default 'pending',
  -- 'pending' | 'won' | 'lost' | 'void'
  created_at   timestamptz default now() not null,
  resolved_at  timestamptz,
  unique (bet_id)
);

create index if not exists pb_status_idx on public.published_bets(status, created_at desc);
create index if not exists pb_user_idx on public.published_bets(user_id);

alter table public.published_bets enable row level security;

-- Tout le monde peut voir les paris publiés
drop policy if exists "pb_read_all" on public.published_bets;
create policy "pb_read_all"
  on public.published_bets for select
  using (true);

-- Un user peut publier ses propres paris
drop policy if exists "pb_insert_self" on public.published_bets;
create policy "pb_insert_self"
  on public.published_bets for insert
  with check (auth.uid() = user_id);

-- Un user peut supprimer ses propres publications
drop policy if exists "pb_delete_self" on public.published_bets;
create policy "pb_delete_self"
  on public.published_bets for delete
  using (auth.uid() = user_id);

-- 2. Table votes : votes ✓ ou ✗ d'autres users sur un pari publié
create table if not exists public.bet_votes (
  published_bet_id uuid not null references public.published_bets(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  vote             text not null check (vote in ('yes', 'no')),
  created_at       timestamptz default now() not null,
  primary key (published_bet_id, user_id)
);

create index if not exists bv_pb_idx on public.bet_votes(published_bet_id);
create index if not exists bv_user_idx on public.bet_votes(user_id);

alter table public.bet_votes enable row level security;

-- Tout le monde peut lire les votes (pour voir le compteur)
drop policy if exists "bv_read_all" on public.bet_votes;
create policy "bv_read_all"
  on public.bet_votes for select
  using (true);

-- Un user peut voter en son nom
drop policy if exists "bv_insert_self" on public.bet_votes;
create policy "bv_insert_self"
  on public.bet_votes for insert
  with check (auth.uid() = user_id);

-- Un user peut changer son vote
drop policy if exists "bv_update_self" on public.bet_votes;
create policy "bv_update_self"
  on public.bet_votes for update
  using (auth.uid() = user_id);

-- 3. Trigger : à chaque vote, on met à jour les compteurs sur published_bets
create or replace function public.update_vote_counts()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    if new.vote = 'yes' then
      update public.published_bets set votes_yes = votes_yes + 1 where id = new.published_bet_id;
    else
      update public.published_bets set votes_no = votes_no + 1 where id = new.published_bet_id;
    end if;
  elsif (TG_OP = 'UPDATE') then
    -- Vote changé : décrémente l'ancien, incrémente le nouveau
    if old.vote = 'yes' and new.vote = 'no' then
      update public.published_bets
        set votes_yes = greatest(0, votes_yes - 1),
            votes_no = votes_no + 1
        where id = new.published_bet_id;
    elsif old.vote = 'no' and new.vote = 'yes' then
      update public.published_bets
        set votes_no = greatest(0, votes_no - 1),
            votes_yes = votes_yes + 1
        where id = new.published_bet_id;
    end if;
  elsif (TG_OP = 'DELETE') then
    if old.vote = 'yes' then
      update public.published_bets set votes_yes = greatest(0, votes_yes - 1) where id = old.published_bet_id;
    else
      update public.published_bets set votes_no = greatest(0, votes_no - 1) where id = old.published_bet_id;
    end if;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_update_vote_counts on public.bet_votes;
create trigger trg_update_vote_counts
  after insert or update or delete on public.bet_votes
  for each row execute function public.update_vote_counts();

-- ============================================================
-- D-2 : BATTLES 1v1 (défier un ami sur la semaine)
-- ============================================================

-- 1. Table battles : un défi entre 2 users
create table if not exists public.battles (
  id            uuid primary key default uuid_generate_v4(),
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id   uuid not null references public.profiles(id) on delete cascade,
  metric        text not null default 'roi',  -- 'roi' | 'profit' | 'winrate'
  stake         integer not null default 10,  -- crédits que le loser paie au winner
  status        text not null default 'pending',
  -- 'pending' (en attente accept) | 'active' (en cours) | 'computed' (résolue) | 'rejected' (refusée)
  challenger_value numeric default 0,
  opponent_value   numeric default 0,
  winner_id     uuid references public.profiles(id),
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  resolved_at   timestamptz,
  created_at    timestamptz default now() not null,
  check (challenger_id <> opponent_id)
);

create index if not exists battles_user_idx on public.battles(challenger_id, opponent_id, status);
create index if not exists battles_status_idx on public.battles(status, ends_at);

alter table public.battles enable row level security;

-- Un user voit ses propres battles (challenger ou opponent)
drop policy if exists "battles_read_self" on public.battles;
create policy "battles_read_self"
  on public.battles for select
  using (auth.uid() = challenger_id or auth.uid() = opponent_id);

-- Un user peut créer des battles dont il est challenger
drop policy if exists "battles_insert_self" on public.battles;
create policy "battles_insert_self"
  on public.battles for insert
  with check (auth.uid() = challenger_id);

-- Un user peut update ses battles (accepter/refuser si opponent, annuler si challenger)
drop policy if exists "battles_update_self" on public.battles;
create policy "battles_update_self"
  on public.battles for update
  using (auth.uid() = challenger_id or auth.uid() = opponent_id);

-- ============================================================
-- VERIFICATION
-- ============================================================
-- select count(*) from public.published_bets;  -- doit être 0
-- select count(*) from public.bet_votes;       -- doit être 0
-- select count(*) from public.battles;         -- doit être 0
