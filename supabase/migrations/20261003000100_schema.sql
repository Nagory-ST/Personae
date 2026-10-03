-- =============================================================================
-- Personae — schéma de données (portage Supabase de la migration Alembic
-- `4d6074f85400 schema initial`).
--
-- Principe de sécurité : les tables vivent dans le schéma PRIVÉ `personae`,
-- qui n'est PAS exposé par l'API REST de Supabase (PostgREST n'expose que
-- `public` et `graphql_public`). Un client — même muni de la clé publique —
-- ne peut donc ni lire ni écrire une table directement. Tout passe par les
-- fonctions de `public` (migration suivante), qui portent chacune leur propre
-- contrôle d'accès. RLS est en plus activée partout, sans aucune policy :
-- défense en profondeur si le schéma venait à être exposé par erreur.
--
-- Tables non portées (hors périmètre de la démo publique, jamais lues par le
-- front) : admin_action_log, import_run, user_consent, erasure_log, report,
-- work_field_override, genre_mapping.
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

create schema if not exists personae;
revoke all on schema personae from public, anon, authenticated;

-- Normalisation unique, utilisée par le chargement ET par la recherche
-- (équivalent de `app/services/recherche.py::normaliser`).
create or replace function personae.normaliser(valeur text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(valeur, ''))), '\s+', ' ', 'g')
$$;

-- ---------------------------------------------------------------- référence
create table personae.work_type (
  code        varchar(30) primary key,
  label       varchar(60) not null,
  sort_order  integer not null default 0,
  is_enabled  boolean not null default true
);

create table personae.work_subtype (
  code            varchar(30) primary key,
  work_type_code  varchar(30) not null references personae.work_type(code),
  label           varchar(60) not null,
  sort_order      integer not null default 0
);

create table personae.credit_role (
  code             varchar(30) primary key,
  label            varchar(60) not null,
  applies_to_type  varchar(30) references personae.work_type(code),
  sort_order       integer not null default 0
);

create table personae.work_relation_type (
  code          varchar(30) primary key,
  label         varchar(60) not null,
  inverse_code  varchar(30)
);

create table personae.external_source (
  code              varchar(30) primary key,
  label             varchar(100) not null,
  attribution_text  text not null,
  is_enabled        boolean not null default true
);

create table personae.genre (
  id          uuid primary key,
  slug        varchar(60) not null unique,
  label       varchar(60) not null,
  sort_order  integer not null default 0
);

-- ---------------------------------------------------------------- catalogue
create table personae.person (
  id              uuid primary key,
  full_name       varchar(300) not null,
  full_name_norm  varchar(300) not null,
  bio             text,
  birth_date      date,
  death_date      date,
  attributes      jsonb not null default '{}'::jsonb,
  search_vector   tsvector generated always as
                    (to_tsvector('french', coalesce(full_name, '') || ' ' || coalesce(bio, ''))) stored,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint ck_person_dates_coherentes
    check (death_date is null or birth_date is null or death_date >= birth_date)
);
create index ix_person_name_norm_trgm on personae.person using gin (full_name_norm extensions.gin_trgm_ops);
create index ix_person_search_vector on personae.person using gin (search_vector);

create table personae.work (
  id                 uuid primary key,
  slug               varchar(200) not null unique,
  work_type_code     varchar(30) not null references personae.work_type(code),
  work_subtype_code  varchar(30) references personae.work_subtype(code),
  title              varchar(500) not null,
  title_norm         varchar(500) not null,
  original_title     varchar(500),
  release_date       date,
  original_language  varchar(8),
  synopsis           text,
  runtime_minutes    integer,
  attributes         jsonb not null default '{}'::jsonb,
  search_vector      tsvector generated always as
                       (to_tsvector('french', coalesce(title, '') || ' ' || coalesce(original_title, '') || ' ' || coalesce(synopsis, ''))) stored,
  is_manual          boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index ix_work_search_vector on personae.work using gin (search_vector);
create index ix_work_title_norm_trgm on personae.work using gin (title_norm extensions.gin_trgm_ops);
create index ix_work_type_release on personae.work (work_type_code, release_date);

create table personae.work_genre (
  work_id   uuid not null references personae.work(id) on delete cascade,
  genre_id  uuid not null references personae.genre(id) on delete cascade,
  primary key (work_id, genre_id)
);
create index ix_work_genre_genre on personae.work_genre (genre_id);

create table personae.credit (
  id                uuid primary key,
  work_id           uuid not null references personae.work(id) on delete cascade,
  person_id         uuid not null references personae.person(id) on delete cascade,
  credit_role_code  varchar(30) not null references personae.credit_role(code),
  character_name    varchar(200),
  display_order     integer not null default 0,
  constraint uq_credit_unique unique (work_id, person_id, credit_role_code, character_name)
);
create index ix_credit_person_role on personae.credit (person_id, credit_role_code);
create index ix_credit_work_order on personae.credit (work_id, display_order);

create table personae.external_ref (
  id           uuid primary key,
  source_code  varchar(30) not null references personae.external_source(code),
  work_id      uuid references personae.work(id) on delete cascade,
  person_id    uuid references personae.person(id) on delete cascade,
  external_id  varchar(100) not null,
  synced_at    timestamptz not null default now(),
  constraint ck_external_ref_cible_exclusive check ((work_id is not null) <> (person_id is not null)),
  constraint uq_external_ref_source_id unique (source_code, external_id)
);
create index ix_external_ref_work on personae.external_ref (work_id);
create index ix_external_ref_person on personae.external_ref (person_id);

create table personae.work_relation (
  id                  uuid primary key,
  from_work_id        uuid not null references personae.work(id) on delete cascade,
  to_work_id          uuid not null references personae.work(id) on delete cascade,
  relation_type_code  varchar(30) not null references personae.work_relation_type(code),
  position            integer,
  constraint ck_work_relation_pas_de_boucle check (from_work_id <> to_work_id),
  constraint uq_work_relation unique (from_work_id, to_work_id, relation_type_code)
);
create index ix_work_relation_to on personae.work_relation (to_work_id);

create table personae.theme (
  id            uuid primary key,
  slug          varchar(60) not null unique,
  label         varchar(100) not null,
  description   text,
  is_published  boolean not null default false,
  sort_order    integer not null default 0
);

create table personae.work_theme (
  work_id   uuid not null references personae.work(id) on delete cascade,
  theme_id  uuid not null references personae.theme(id) on delete cascade,
  position  integer not null default 0,
  primary key (work_id, theme_id)
);
create index ix_work_theme_theme on personae.work_theme (theme_id, position);

-- ---------------------------------------------------------------- comptes
-- Le mot de passe n'est plus ici : il est géré par Supabase Auth (auth.users).
-- `app_user.id` EST l'identifiant Supabase Auth. Un compte Auth sans ligne
-- `app_user` active ne peut RIEN écrire : c'est ce qui ferme l'inscription
-- même si quelqu'un parvenait à créer un compte Auth.
create table personae.app_user (
  id             uuid primary key references auth.users(id) on delete cascade,
  pseudo         varchar(50) not null,
  display_name   varchar(100),
  bio            text,
  is_active      boolean not null default true,
  is_superadmin  boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index uq_app_user_pseudo_lower on personae.app_user (lower(pseudo));

create table personae.follow (
  follower_id  uuid not null references personae.app_user(id) on delete cascade,
  followee_id  uuid not null references personae.app_user(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint ck_follow_pas_soi_meme check (follower_id <> followee_id)
);
create index ix_follow_followee on personae.follow (followee_id);

create table personae.review (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references personae.app_user(id) on delete cascade,
  work_id         uuid not null references personae.work(id) on delete cascade,
  rating          numeric(3,1) not null,
  body            text,
  status          varchar(20) not null default 'publie',
  removal_reason  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint ck_review_status check (status in ('publie', 'retire')),
  constraint ck_review_body_taille check (body is null or length(body) <= 5000),
  constraint ck_review_rating_bornes check (rating >= 0 and rating <= 10),
  constraint uq_review_user_work unique (user_id, work_id)
);
create index ix_review_user_created on personae.review (user_id, created_at);
create index ix_review_work_status on personae.review (work_id, status);

create table personae.collection_entry (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references personae.app_user(id) on delete cascade,
  work_id       uuid not null references personae.work(id) on delete cascade,
  status        varchar(20) not null default 'to_consume',
  is_favorite   boolean not null default false,
  is_highlight  boolean not null default false,
  added_at      timestamptz not null default now(),
  consumed_at   timestamptz,
  constraint ck_collection_consumed_coherent check ((status = 'consumed') = (consumed_at is not null)),
  constraint ck_collection_status check (status in ('to_consume', 'consumed', 'dropped')),
  constraint uq_collection_user_work unique (user_id, work_id)
);
create index ix_collection_user_status on personae.collection_entry (user_id, status);
create index ix_collection_work on personae.collection_entry (work_id);

-- ---------------------------------------------------------------- verrouillage
-- RLS activée sur toutes les tables, AUCUNE policy : un accès direct par
-- anon/authenticated est refusé même si le schéma était exposé un jour.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'personae' loop
    execute format('alter table personae.%I enable row level security', t.tablename);
    execute format('revoke all on personae.%I from public, anon, authenticated', t.tablename);
  end loop;
end $$;
