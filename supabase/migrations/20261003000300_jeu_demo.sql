-- =============================================================================
-- Personae — chargement du jeu de démonstration (portage de `app/seed/seed.py`).
--
-- Déterminisme conservé (CA-D2) : identifiants UUID v5 dérivés du MÊME espace
-- de noms et des MÊMES clés que le seed Python — les URL de la démo
-- (`/oeuvres/la-la-land`, `/profil/<uuid>`) sont donc identiques à la version
-- Docker locale.
--
-- Le jeu source (4 fichiers JSON) est stocké dans `personae.jeu_source`, ce qui
-- permet à `personae.charger_jeu()` de tout recharger SANS client externe :
-- c'est elle que la tâche planifiée appelle chaque nuit pour effacer ce que
-- les visiteurs de la démo publique ont écrit.
--
-- Comptes : les 4 comptes fictifs sont créés dans Supabase Auth par
-- `personae.creer_comptes_demo(mot_de_passe)`. Le mot de passe n'est JAMAIS
-- écrit dans ce dépôt public : il est fourni à l'exécution, une seule fois.
-- =============================================================================

create table if not exists personae.jeu_source (
  nom      text primary key check (nom in ('reference', 'persons', 'works', 'community')),
  contenu  jsonb not null
);
alter table personae.jeu_source enable row level security;
revoke all on personae.jeu_source from public, anon, authenticated;

create or replace function personae.uid(p_genre text, p_slug text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select extensions.uuid_generate_v5('6f9b4c2e-1d3a-5e7f-8a9b-0c1d2e3f4a5b'::uuid, p_genre || ':' || p_slug)
$$;

-- Crée (ou laisse en place) les comptes Auth des utilisateurs du jeu.
-- N'écrase JAMAIS un mot de passe existant.
create or replace function personae.creer_comptes_demo(p_mot_de_passe text)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  u jsonb;
  v_id uuid;
  v_crees integer := 0;
begin
  if p_mot_de_passe is null or length(p_mot_de_passe) < 16 then
    raise exception 'Mot de passe de démonstration trop court (16 caractères minimum).';
  end if;

  for u in select jsonb_array_elements(contenu -> 'users') from personae.jeu_source where nom = 'community' loop
    v_id := personae.uid('user', u ->> 'slug');
    if not exists (select 1 from auth.users where id = v_id) then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token)
      values (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
        u ->> 'email', extensions.crypt(p_mot_de_passe, extensions.gen_salt('bf', 12)), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
        '', '', '', '');
      insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (v_id::text, v_id,
              jsonb_build_object('sub', v_id::text, 'email', u ->> 'email', 'email_verified', true),
              'email', now(), now(), now());
      v_crees := v_crees + 1;
    end if;
  end loop;
  return v_crees;
end $$;

-- Vide puis recharge tout le contenu applicatif depuis `jeu_source`.
-- Ne touche pas à `auth.users` : les comptes et leurs mots de passe restent.
create or replace function personae.charger_jeu()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  ref jsonb;
  per jsonb;
  wrk jsonb;
  com jsonb;
  w jsonb;
  t jsonb;
  c jsonb;
  i integer;
  v_instant constant timestamptz := '2026-08-30 00:00:00+00';
begin
  select contenu into ref from personae.jeu_source where nom = 'reference';
  select contenu into per from personae.jeu_source where nom = 'persons';
  select contenu into wrk from personae.jeu_source where nom = 'works';
  select contenu into com from personae.jeu_source where nom = 'community';
  if ref is null or per is null or wrk is null or com is null then
    raise exception 'Jeu source incomplet : charger les 4 fichiers dans personae.jeu_source.';
  end if;

  truncate personae.work_theme, personae.theme, personae.collection_entry, personae.follow,
           personae.review, personae.work_relation, personae.work_genre, personae.credit,
           personae.external_ref, personae.work, personae.person, personae.app_user,
           personae.genre, personae.credit_role, personae.work_relation_type,
           personae.work_subtype, personae.work_type, personae.external_source;

  -- Référence
  insert into personae.work_type (code, label, sort_order, is_enabled)
  select x ->> 'code', x ->> 'label', (x ->> 'sort_order')::int, (x ->> 'is_enabled')::boolean
  from jsonb_array_elements(ref -> 'work_types') x;

  insert into personae.credit_role (code, label, applies_to_type, sort_order)
  select x ->> 'code', x ->> 'label', x ->> 'applies_to_type', (x ->> 'sort_order')::int
  from jsonb_array_elements(ref -> 'credit_roles') x;

  insert into personae.work_relation_type (code, label, inverse_code)
  select x ->> 'code', x ->> 'label', x ->> 'inverse_code'
  from jsonb_array_elements(ref -> 'work_relation_types') x;

  insert into personae.external_source (code, label, attribution_text, is_enabled)
  select x ->> 'code', x ->> 'label', x ->> 'attribution_text', (x ->> 'is_enabled')::boolean
  from jsonb_array_elements(ref -> 'external_sources') x;

  insert into personae.genre (id, slug, label, sort_order)
  select personae.uid('genre', x ->> 'slug'), x ->> 'slug', x ->> 'label', (x ->> 'sort_order')::int
  from jsonb_array_elements(ref -> 'genres') x;

  -- Personnes (aucune photo : droit à l'image, CDC §8)
  insert into personae.person (id, full_name, full_name_norm, bio, birth_date, death_date, attributes, created_at, updated_at)
  select personae.uid('person', x ->> 'slug'), x ->> 'full_name', personae.normaliser(x ->> 'full_name'),
         x ->> 'bio', (x ->> 'birth_date')::date, (x ->> 'death_date')::date,
         jsonb_build_object('slug', x ->> 'slug'), v_instant, v_instant
  from jsonb_array_elements(per -> 'persons') x;

  -- Œuvres
  insert into personae.work (id, slug, work_type_code, title, title_norm, original_title, release_date,
                             original_language, synopsis, runtime_minutes, attributes, is_manual, created_at, updated_at)
  select personae.uid('work', x ->> 'slug'), x ->> 'slug', x ->> 'type', x ->> 'title',
         personae.normaliser(x ->> 'title'), x ->> 'original_title', (x ->> 'release_date')::date,
         x ->> 'original_language', x ->> 'synopsis', (x ->> 'runtime_minutes')::int,
         coalesce(x -> 'attributes', '{}'::jsonb)
           || jsonb_build_object('slug', x ->> 'slug', 'date_precision', x ->> 'date_precision'),
         (x ->> 'source') = 'manuel', v_instant, v_instant
  from jsonb_array_elements(wrk -> 'works') x;

  for w in select jsonb_array_elements(wrk -> 'works') loop
    insert into personae.work_genre (work_id, genre_id)
    select personae.uid('work', w ->> 'slug'), personae.uid('genre', g)
    from jsonb_array_elements_text(w -> 'genres') g;

    insert into personae.credit (id, work_id, person_id, credit_role_code, character_name, display_order)
    select personae.uid('credit', (w ->> 'slug') || ':' || (c2 ->> 'person') || ':' || (c2 ->> 'role') || ':' || coalesce(c2 ->> 'character', '')),
           personae.uid('work', w ->> 'slug'), personae.uid('person', c2 ->> 'person'),
           c2 ->> 'role', c2 ->> 'character', (c2 ->> 'order')::int
    from jsonb_array_elements(w -> 'credits') c2;

    insert into personae.external_ref (id, source_code, work_id, external_id, synced_at)
    values (personae.uid('extref', w ->> 'slug'), w ->> 'source', personae.uid('work', w ->> 'slug'),
            'demo:' || (w ->> 'slug'), v_instant);
  end loop;

  insert into personae.work_relation (id, from_work_id, to_work_id, relation_type_code)
  select personae.uid('relation', (x ->> 'from') || ':' || (x ->> 'to') || ':' || (x ->> 'type')),
         personae.uid('work', x ->> 'from'), personae.uid('work', x ->> 'to'), x ->> 'type'
  from jsonb_array_elements(wrk -> 'relations') x;

  -- Communauté. Seuls les comptes qui existent dans Supabase Auth sont chargés
  -- (FK vers auth.users) : sans `creer_comptes_demo`, le catalogue fonctionne,
  -- simplement sans avis.
  insert into personae.app_user (id, pseudo, display_name, bio, is_active, is_superadmin, created_at, updated_at)
  select personae.uid('user', x ->> 'slug'), x ->> 'pseudo', x ->> 'display_name', x ->> 'bio', true,
         -- Aucun super-administrateur sur la démo publique : il n'existe pas
         -- d'écran d'administration, et un droit inutile est un droit de trop.
         false, v_instant, v_instant
  from jsonb_array_elements(com -> 'users') x
  where exists (select 1 from auth.users a where a.id = personae.uid('user', x ->> 'slug'));

  insert into personae.follow (follower_id, followee_id, created_at)
  select personae.uid('user', x ->> 'follower'), personae.uid('user', x ->> 'followee'), v_instant
  from jsonb_array_elements(com -> 'follows') x
  where exists (select 1 from personae.app_user where id = personae.uid('user', x ->> 'follower'))
    and exists (select 1 from personae.app_user where id = personae.uid('user', x ->> 'followee'));

  insert into personae.review (id, user_id, work_id, rating, body, status, created_at, updated_at)
  select personae.uid('review', (x ->> 'user') || ':' || (x ->> 'work')),
         personae.uid('user', x ->> 'user'), personae.uid('work', x ->> 'work'),
         (x ->> 'rating')::numeric, x ->> 'body', 'publie',
         ((x ->> 'date') || ' 00:00:00+00')::timestamptz, ((x ->> 'date') || ' 00:00:00+00')::timestamptz
  from jsonb_array_elements(com -> 'reviews') x
  where exists (select 1 from personae.app_user where id = personae.uid('user', x ->> 'user'));

  insert into personae.collection_entry (id, user_id, work_id, status, is_favorite, is_highlight, added_at, consumed_at)
  select personae.uid('collection', (x ->> 'user') || ':' || (x ->> 'work')),
         personae.uid('user', x ->> 'user'), personae.uid('work', x ->> 'work'),
         x ->> 'status', coalesce((x ->> 'is_favorite')::boolean, false),
         coalesce((x ->> 'is_highlight')::boolean, false), v_instant,
         case when x ->> 'consumed_at' is not null then ((x ->> 'consumed_at') || ' 00:00:00+00')::timestamptz end
  from jsonb_array_elements(com -> 'collection') x
  where exists (select 1 from personae.app_user where id = personae.uid('user', x ->> 'user'));

  for t in select jsonb_array_elements(com -> 'themes') loop
    insert into personae.theme (id, slug, label, description, is_published, sort_order)
    values (personae.uid('theme', t ->> 'slug'), t ->> 'slug', t ->> 'label', t ->> 'description',
            (t ->> 'is_published')::boolean, (t ->> 'sort_order')::int);
    i := 0;
    for c in select jsonb_array_elements(t -> 'works') loop
      insert into personae.work_theme (work_id, theme_id, position)
      values (personae.uid('work', c #>> '{}'), personae.uid('theme', t ->> 'slug'), i);
      i := i + 1;
    end loop;
  end loop;

  return format('Jeu chargé : %s œuvres · %s personnes · %s avis · %s relations · %s comptes',
    (select count(*) from personae.work), (select count(*) from personae.person),
    (select count(*) from personae.review), (select count(*) from personae.work_relation),
    (select count(*) from personae.app_user));
end $$;

revoke all on function personae.uid(text, text), personae.creer_comptes_demo(text), personae.charger_jeu()
  from public, anon, authenticated;
