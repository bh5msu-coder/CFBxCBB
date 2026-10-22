-- CFB×CBB Power Index — community duels (anonymous, aggregate-only).
-- Applied to the shared Supabase project as migration `cfbxcbb_community_duels`.
-- Namespaced cfbxcbb_* because the project is shared with another app; each
-- table is isolated by its own Row Level Security. Re-runnable reference copy.
--
-- Allowlist sync: `cfbxcbb_programs` must contain every program the client can
-- send. `supabase/cfbxcbb_programs.json` is generated from src/data.js and a
-- unit test fails if the two drift — when a program is added to data.js,
-- regenerate the JSON and append the name here.

create table public.cfbxcbb_programs (
  name text primary key
);

create table public.cfbxcbb_ratings (
  program    text primary key references public.cfbxcbb_programs(name) on delete cascade,
  rating     double precision not null default 1500,
  votes      integer not null default 0,
  wins       integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.cfbxcbb_duel_votes (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  winner     text not null references public.cfbxcbb_programs(name),
  loser      text not null references public.cfbxcbb_programs(name),
  voter      text not null,
  check (winner <> loser)
);
create index cfbxcbb_duel_votes_voter_time on public.cfbxcbb_duel_votes (voter, created_at desc);

-- Lock everything down, then expose only what the client needs.
alter table public.cfbxcbb_programs   enable row level security;
alter table public.cfbxcbb_ratings    enable row level security;
alter table public.cfbxcbb_duel_votes enable row level security;

create policy "cfbxcbb ratings are public"  on public.cfbxcbb_ratings  for select to anon, authenticated using (true);
create policy "cfbxcbb programs are public" on public.cfbxcbb_programs for select to anon, authenticated using (true);
-- No policies on cfbxcbb_duel_votes: only the definer function below can touch it.

-- The ONLY write path. Validates both programs against the allowlist, rate-
-- limits per anonymous voter, appends to the audit log and applies Elo (K=32)
-- atomically. SECURITY DEFINER so it may write tables the caller cannot;
-- search_path pinned so it cannot be hijacked.
create or replace function public.cfbxcbb_cast_vote(p_winner text, p_loser text, p_voter text)
returns table (out_program text, out_rating double precision)
language plpgsql security definer set search_path = public
as $$
declare
  recent int;
  ra double precision;
  rb double precision;
  ea double precision;
  k  constant double precision := 32;
begin
  if p_winner is null or p_loser is null or p_winner = p_loser then
    raise exception 'invalid_pair' using errcode = '22023';
  end if;
  if p_voter is null or length(p_voter) < 8 or length(p_voter) > 64 then
    raise exception 'invalid_voter' using errcode = '22023';
  end if;
  if not exists (select 1 from cfbxcbb_programs where name = p_winner)
     or not exists (select 1 from cfbxcbb_programs where name = p_loser) then
    raise exception 'unknown_program' using errcode = '22023';
  end if;

  -- A human taps roughly one duel a second at most; 120/hour stops scripts.
  select count(*) into recent from cfbxcbb_duel_votes
   where voter = p_voter and created_at > now() - interval '1 hour';
  if recent >= 120 then
    raise exception 'rate_limited' using errcode = '53400';
  end if;

  insert into cfbxcbb_duel_votes (winner, loser, voter) values (p_winner, p_loser, p_voter);

  insert into cfbxcbb_ratings (program) values (p_winner) on conflict do nothing;
  insert into cfbxcbb_ratings (program) values (p_loser)  on conflict do nothing;

  -- Lock both rows in a stable order so concurrent votes can't deadlock.
  perform 1 from cfbxcbb_ratings r where r.program in (p_winner, p_loser) order by r.program for update;

  select r.rating into ra from cfbxcbb_ratings r where r.program = p_winner;
  select r.rating into rb from cfbxcbb_ratings r where r.program = p_loser;
  ea := 1 / (1 + power(10, (rb - ra) / 400));

  update cfbxcbb_ratings set rating = ra + k * (1 - ea), votes = votes + 1, wins = wins + 1, updated_at = now()
   where cfbxcbb_ratings.program = p_winner;
  update cfbxcbb_ratings set rating = rb - k * (1 - ea), votes = votes + 1, updated_at = now()
   where cfbxcbb_ratings.program = p_loser;

  return query select r.program, r.rating from cfbxcbb_ratings r where r.program in (p_winner, p_loser);
end;
$$;

revoke all on function public.cfbxcbb_cast_vote(text, text, text) from public;
grant execute on function public.cfbxcbb_cast_vote(text, text, text) to anon, authenticated;

-- Seed: the 69 rated programs (generated from src/data.js).
insert into public.cfbxcbb_programs (name) values
('Alabama'),('Arizona'),('Auburn'),('BYU'),('Baylor'),('Boise State'),('California'),('Cincinnati'),('Clemson'),('Colorado'),('Connecticut'),('Creighton'),('Duke'),('Florida'),('Florida State'),('Georgetown'),('Georgia'),('Gonzaga'),('Houston'),('Illinois'),('Indiana'),('Iowa'),('Iowa State'),('Kansas'),('Kentucky'),('LSU'),('Louisville'),('Marquette'),('Maryland'),('Memphis'),('Miami (FL)'),('Michigan'),('Michigan State'),('Mississippi'),('Missouri'),('NC State'),('Nebraska'),('North Carolina'),('Notre Dame'),('Ohio State'),('Oklahoma'),('Oklahoma State'),('Oregon'),('Penn State'),('Pittsburgh'),('Providence'),('Purdue'),('Saint John''s'),('Seton Hall'),('South Carolina'),('Stanford'),('Syracuse'),('TCU'),('Tennessee'),('Texas'),('Texas A&M'),('Texas Tech'),('UCLA'),('UNLV'),('USC'),('Utah'),('Villanova'),('Virginia'),('Virginia Tech'),('Washington'),('West Virginia'),('Wichita State'),('Wisconsin'),('Xavier')
on conflict do nothing;
