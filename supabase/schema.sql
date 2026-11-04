-- Einmal im Supabase SQL-Editor ausführen (ganzer Inhalt, dann "Run").
-- Jede Gruppe hat einen eigenen Code. Ohne den passenden Code sieht und ändert niemand etwas.

create table if not exists public.reviews (
  id text primary key,                 -- "<standId>:<authorId>"
  group_code text not null check (char_length(group_code) between 6 and 40),
  stand_id text not null,
  author_id text not null,
  author text not null check (char_length(author) between 1 and 30),
  scores smallint[] not null check (array_length(scores, 1) = 5),
  comment text not null default '' check (char_length(comment) <= 300),
  photos jsonb not null default '[]',
  updated_at timestamptz not null default now()
);
create index if not exists reviews_group_idx on public.reviews (group_code);

-- Neuere Supabase-Projekte geben neue Tabellen nicht automatisch für die App frei.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.reviews to anon, authenticated;

-- Der Gruppencode kommt als HTTP-Header "x-group-code" von der App.
create or replace function public.request_group() returns text
language sql stable as $$
  select coalesce(current_setting('request.headers', true)::json ->> 'x-group-code', '')
$$;
grant execute on function public.request_group() to anon, authenticated;

alter table public.reviews enable row level security;
drop policy if exists "gruppe lesen" on public.reviews;
drop policy if exists "gruppe anlegen" on public.reviews;
drop policy if exists "gruppe ändern" on public.reviews;
drop policy if exists "gruppe löschen" on public.reviews;
create policy "gruppe lesen" on public.reviews for select using (group_code = public.request_group());
create policy "gruppe anlegen" on public.reviews for insert with check (group_code = public.request_group());
create policy "gruppe ändern" on public.reviews for update using (group_code = public.request_group()) with check (group_code = public.request_group());
create policy "gruppe löschen" on public.reviews for delete using (group_code = public.request_group());

-- Fotos: öffentlich abrufbar über ihre (nicht erratbare) Adresse, aber nicht auflistbar.
insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict (id) do nothing;
drop policy if exists "fotos hochladen" on storage.objects;
drop policy if exists "fotos ersetzen" on storage.objects;
create policy "fotos hochladen" on storage.objects for insert with check (bucket_id = 'photos');
create policy "fotos ersetzen" on storage.objects for update using (bucket_id = 'photos');

-- ───────────── Admin-Bereich (Stände bearbeiten, Events auslösen) ─────────────
-- Wer eine Gruppe als Erste:r einrichtet, legt einen Admin-Code fest. Gespeichert wird nur sein SHA-256-Hash.
-- Die App schickt den Code als Header "x-admin-key"; Schreibrechte auf Stände und Events gibt es nur damit.
create table if not exists public.groups (
  code text primary key check (char_length(code) between 6 and 40),
  admin_hash text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.stands (
  group_code text not null,
  id text not null,
  position int not null default 0,
  name text not null check (char_length(name) between 1 and 60),
  place text not null default '' check (char_length(place) <= 60),
  wine text not null default '' check (char_length(wine) <= 80),
  description text not null default '' check (char_length(description) <= 500),
  image text not null default '',
  lng double precision not null,
  lat double precision not null,
  updated_at timestamptz not null default now(),
  primary key (group_code, id)
);
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  group_code text not null,
  kind text not null check (kind in ('treffpunkt', 'countdown', 'runde', 'sieger', 'text')),
  title text not null check (char_length(title) between 1 and 80),
  body text not null default '' check (char_length(body) <= 300),
  stand_id text,
  ends_at timestamptz,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 hours'
);
create index if not exists events_group_idx on public.events (group_code, created_at desc);

grant insert on public.groups to anon, authenticated;
grant select, insert, update, delete on public.stands to anon, authenticated;
grant select, insert, update, delete on public.events to anon, authenticated;

create or replace function public.request_admin_hash() returns text
language sql stable as $$
  select encode(sha256(convert_to(coalesce(current_setting('request.headers', true)::json ->> 'x-admin-key', ''), 'UTF8')), 'hex')
$$;
-- security definer: darf die Tabelle groups lesen, die für die App selbst nicht lesbar ist.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.groups g where g.code = public.request_group() and g.admin_hash = public.request_admin_hash())
$$;
create or replace function public.group_has_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.groups g where g.code = public.request_group())
$$;
grant execute on function public.request_admin_hash(), public.is_admin(), public.group_has_admin() to anon, authenticated;

alter table public.groups enable row level security;
alter table public.stands enable row level security;
alter table public.events enable row level security;
drop policy if exists "gruppe einrichten" on public.groups;
create policy "gruppe einrichten" on public.groups for insert
  with check (code = public.request_group() and admin_hash = public.request_admin_hash());
drop policy if exists "stände lesen" on public.stands;
drop policy if exists "stände admin" on public.stands;
create policy "stände lesen" on public.stands for select using (group_code = public.request_group());
create policy "stände admin" on public.stands for all
  using (group_code = public.request_group() and public.is_admin())
  with check (group_code = public.request_group() and public.is_admin());
drop policy if exists "events lesen" on public.events;
drop policy if exists "events admin" on public.events;
create policy "events lesen" on public.events for select using (group_code = public.request_group());
create policy "events admin" on public.events for all
  using (group_code = public.request_group() and public.is_admin())
  with check (group_code = public.request_group() and public.is_admin());

-- ───────────── Nasenmeister (Ehrentitel, ohne Sonderrechte) ─────────────
create table if not exists public.group_meta (
  group_code text primary key,
  nasenmeister_id text,
  nasenmeister_name text,
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.group_meta to anon, authenticated;
alter table public.group_meta enable row level security;
drop policy if exists "meta lesen" on public.group_meta;
drop policy if exists "meta admin" on public.group_meta;
create policy "meta lesen" on public.group_meta for select using (group_code = public.request_group());
create policy "meta admin" on public.group_meta for all
  using (group_code = public.request_group() and public.is_admin())
  with check (group_code = public.request_group() and public.is_admin());
alter table public.events drop constraint if exists events_kind_check;
alter table public.events add constraint events_kind_check check (kind in ('treffpunkt', 'countdown', 'runde', 'sieger', 'text', 'nasenmeister'));

-- ───────────── Nasenmeister darf eigene Events schicken (nur Art "nase") ─────────────
-- Die App schickt die Geräte-ID als Header "x-member-id". Unter Freunden reicht das als Schutz.
alter table public.events drop constraint if exists events_kind_check;
alter table public.events add constraint events_kind_check check (kind in ('treffpunkt', 'countdown', 'runde', 'sieger', 'text', 'nasenmeister', 'nase'));
create or replace function public.request_member() returns text
language sql stable as $$
  select coalesce(current_setting('request.headers', true)::json ->> 'x-member-id', '')
$$;
create or replace function public.is_nasenmeister() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.group_meta m where m.group_code = public.request_group()
    and m.nasenmeister_id is not null and m.nasenmeister_id = public.request_member())
$$;
grant execute on function public.request_member(), public.is_nasenmeister() to anon, authenticated;
drop policy if exists "events nase" on public.events;
create policy "events nase" on public.events for insert
  with check (group_code = public.request_group() and kind = 'nase' and public.is_nasenmeister());

-- ───────────── Löschen: eigene Bewertungen ja, fremde nur als Admin ─────────────
-- Vorher durfte jedes Gruppenmitglied jede Bewertung löschen. Jetzt nur noch die eigene (Geräte-ID im Header
-- "x-member-id") oder als Admin. Gruppe zurücksetzen im Admin-Tab braucht genau diese Regel plus die Admin-Regeln oben.
drop policy if exists "gruppe löschen" on public.reviews;
create policy "gruppe löschen" on public.reviews for delete
  using (group_code = public.request_group() and (author_id = public.request_member() or public.is_admin()));
