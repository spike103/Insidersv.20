-- ============================================================
-- INSIDERS — Système de crédits (Session B)
-- ============================================================
-- À exécuter dans Supabase SQL Editor APRÈS le SQL initial.
-- Idempotent : tu peux le runner plusieurs fois sans casser quoi que ce soit.

-- 1. Ajouter colonne credits aux profils
alter table public.profiles
  add column if not exists credits integer default 0 not null;

-- 2. Table credit_transactions (audit trail des gains/dépenses)
create table if not exists public.credit_transactions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  amount      integer not null,                                -- + = gain, - = dépense
  reason      text not null,                                   -- 'signup', 'win', 'streak_3', 'unlock_pro_1mo', etc.
  metadata    jsonb default '{}'::jsonb not null,
  created_at  timestamptz default now() not null
);

create index if not exists ct_user_idx on public.credit_transactions(user_id, created_at desc);
create index if not exists ct_reason_idx on public.credit_transactions(user_id, reason);

-- 3. RLS sur credit_transactions
alter table public.credit_transactions enable row level security;

-- Lecture : seulement ses propres transactions
drop policy if exists "ct_read_self" on public.credit_transactions;
create policy "ct_read_self"
  on public.credit_transactions for select
  using (auth.uid() = user_id);

-- Insert : seulement pour soi
drop policy if exists "ct_insert_self" on public.credit_transactions;
create policy "ct_insert_self"
  on public.credit_transactions for insert
  with check (auth.uid() = user_id);

-- Pas de update/delete : transactions immuables (audit trail)

-- 4. Mise à jour du trigger handle_new_user pour initialiser credits = 0
-- (déjà à 0 par default, donc rien à changer ici)

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Pour vérifier que tout est en place :
--
-- select column_name, data_type from information_schema.columns
--   where table_schema = 'public' and table_name = 'profiles' and column_name = 'credits';
-- → doit retourner 1 ligne (credits, integer)
--
-- select count(*) from public.credit_transactions;
-- → doit retourner 0 (aucune transaction encore)
