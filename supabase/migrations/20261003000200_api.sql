-- =============================================================================
-- Personae — API (remplace les routes FastAPI de `backend/app/api/`).
--
-- Chaque route utilisée par le front devient une fonction `public.api_*`,
-- appelée par `supabase.rpc()`. Le JSON renvoyé est STRICTEMENT celui de
-- l'ancienne API (mêmes clés, notes en chaîne « 8.4 », dates « AAAA-MM-JJ ») :
-- le front n'a pas à changer sa lecture des données.
--
-- Règles de sécurité appliquées à TOUTES les fonctions :
--   * `security definer` + `set search_path = ''` : la fonction lit le schéma
--     privé, et aucun objet ne peut être substitué par un search_path piégé ;
--     tous les noms sont qualifiés.
--   * L'identité vient UNIQUEMENT de `auth.uid()` (JWT signé par Supabase),
--     jamais d'un paramètre : un appelant ne peut pas écrire au nom d'un autre.
--   * Une écriture exige une ligne `personae.app_user` ACTIVE. Un compte Auth
--     créé hors du jeu (inscription) n'a pas cette ligne : il ne peut rien
--     écrire. C'est la garde côté base de « inscription fermée ».
--   * Les erreurs utilisent les codes PostgREST `PTxxx` → statut HTTP xxx,
--     avec un message en français destiné à l'affichage, sans détail interne.
--   * Aucune donnée personnelle n'est exposée : ni e-mail, ni identifiant
--     Auth autre que l'UUID public du profil.
-- =============================================================================

-- ---------------------------------------------------------------- helpers privés

-- Utilisateur connecté ET actif, sinon NULL.
create or replace function personae.utilisateur_actif()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id from personae.app_user u
  where u.id = (select auth.uid()) and u.is_active
$$;

-- Utilisateur connecté obligatoire (401 sinon).
create or replace function personae.exiger_utilisateur()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v uuid;
begin
  v := personae.utilisateur_actif();
  if v is null then
    raise exception using errcode = 'PT401', message = 'Connexion requise.';
  end if;
  return v;
end $$;

-- Note d'une œuvre — SOURCE UNIQUE de vérité (ex-`services/notation.py`, CA-D3).
-- Seuls les avis publiés comptent ; aucune moyenne n'est stockée.
create or replace function personae.note(p_work uuid, out moyenne text, out nombre integer)
language sql
stable
set search_path = ''
as $$
  select round(avg(r.rating), 1)::text, count(*)::integer
  from personae.review r
  where r.work_id = p_work and r.status = 'publie'
$$;

-- Carte d'œuvre (ex-`services/catalogue.py::cartes`).
create or replace function personae.carte(p_work uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', w.id,
    'slug', w.slug,
    'title', w.title,
    'type', w.work_type_code,
    'type_label', coalesce(t.label, w.work_type_code),
    'release_year', extract(year from w.release_date)::integer,
    'rating_average', n.moyenne,
    'rating_count', n.nombre
  )
  from personae.work w
  left join personae.work_type t on t.code = w.work_type_code
  cross join lateral personae.note(w.id) n
  where w.id = p_work
$$;

-- Liste de cartes dans l'ordre exact des identifiants fournis.
create or replace function personae.cartes(p_ids uuid[])
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(personae.carte(o.id) order by o.ord), '[]'::jsonb)
  from unnest(p_ids) with ordinality as o(id, ord)
$$;

create or replace function personae.distribution(p_work uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_agg(jsonb_build_object('tranche', t, 'nombre', coalesce(c.nb, 0)) order by t)
  from generate_series(0, 10) t
  left join (
    select floor(r.rating)::integer as tranche, count(*)::integer as nb
    from personae.review r
    where r.work_id = p_work and r.status = 'publie'
    group by 1
  ) c on c.tranche = t
$$;

create or replace function personae.oeuvre_par_slug(p_slug text)
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare v uuid;
begin
  select w.id into v from personae.work w where w.slug = p_slug;
  if v is null then
    raise exception using errcode = 'PT404', message = 'Œuvre introuvable.';
  end if;
  return v;
end $$;

create or replace function personae.utilisateur_json(p_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', u.id, 'pseudo', u.pseudo, 'display_name', u.display_name,
    'bio', u.bio, 'is_superadmin', u.is_superadmin)
  from personae.app_user u where u.id = p_id
$$;

-- ---------------------------------------------------------------- lecture publique

-- GET /config — ce que le front doit savoir du mode courant.
-- Démo publique : inscription fermée, aide de connexion MASQUÉE (les
-- identifiants sont transmis hors du site, jamais affichés).
create or replace function public.api_config()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'mode', 'demo-publique',
    'inscription_ouverte', false,
    'aide_connexion_affichee', false)
$$;

-- GET /auth/session — qui est connecté, ou null. Ne lève jamais d'erreur.
create or replace function public.api_session()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select personae.utilisateur_json(personae.utilisateur_actif())::json
$$;

-- GET /types
create or replace function public.api_types()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(json_agg(json_build_object('code', t.code, 'label', t.label) order by t.sort_order), '[]'::json)
  from personae.work_type t where t.is_enabled
$$;

-- GET /genres?type= — uniquement les genres portés par au moins une œuvre.
create or replace function public.api_genres(p_type text default null)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(json_agg(json_build_object('slug', g.slug, 'label', g.label) order by g.sort_order), '[]'::json)
  from personae.genre g
  where exists (
    select 1 from personae.work_genre wg
    join personae.work w on w.id = wg.work_id
    where wg.genre_id = g.id and (p_type is null or w.work_type_code = p_type)
  )
$$;

-- GET /works?type=&genre=&tri=&limite=&decalage=
create or replace function public.api_works(
  p_type text default null,
  p_genre text default null,
  p_tri text default 'recent',
  p_limite integer default 24,
  p_decalage integer default 0)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limite integer := least(greatest(coalesce(p_limite, 24), 1), 100);
  v_decalage integer := greatest(coalesce(p_decalage, 0), 0);
  v_total integer;
  v_ids uuid[];
begin
  if coalesce(p_tri, 'recent') not in ('recent', 'ancien', 'titre', 'note') then
    raise exception using errcode = 'PT400', message = 'Les données saisies sont invalides.';
  end if;

  with filtre as (
    select w.* from personae.work w
    where (p_type is null or w.work_type_code = p_type)
      and (p_genre is null or exists (
        select 1 from personae.work_genre wg join personae.genre g on g.id = wg.genre_id
        where wg.work_id = w.id and g.slug = p_genre))
  )
  select (select count(*) from filtre),
         array(
           select f.id from filtre f
           left join lateral (
             select avg(r.rating) as moy from personae.review r
             where r.work_id = f.id and r.status = 'publie'
           ) m on true
           order by
             case when p_tri = 'recent' or p_tri is null then f.release_date end desc nulls last,
             case when p_tri = 'ancien' then f.release_date end asc nulls last,
             case when p_tri = 'titre' then f.title_norm end asc,
             case when p_tri = 'note' then m.moy end desc nulls last,
             f.id
           limit v_limite offset v_decalage)
    into v_total, v_ids;

  return json_build_object(
    'items', personae.cartes(v_ids),
    'total', v_total,
    'limite', v_limite,
    'decalage', v_decalage);
end $$;

-- GET /works/{slug} — fiche Œuvre complète, état personnel compris.
create or replace function public.api_work(p_slug text)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  w personae.work;
  v_user uuid := personae.utilisateur_actif();
  v_note record;
  v_rel jsonb;
  v_sim uuid[];
  v_propre personae.review;
  v_statut text;
begin
  select * into w from personae.work where slug = p_slug;
  if w.id is null then
    raise exception using errcode = 'PT404', message = 'Œuvre introuvable.';
  end if;

  select * into v_note from personae.note(w.id);

  -- Relations lues dans les deux sens (le lien n'est stocké qu'une fois).
  select coalesce(jsonb_agg(jsonb_build_object('label', x.label, 'work', personae.carte(x.wid)) order by x.sens, x.label), '[]'::jsonb)
    into v_rel
  from (
    select 1 as sens, t.label, r.to_work_id as wid
    from personae.work_relation r
    join personae.work_relation_type t on t.code = r.relation_type_code
    where r.from_work_id = w.id
    union all
    select 2, ti.label, r.from_work_id
    from personae.work_relation r
    join personae.work_relation_type t on t.code = r.relation_type_code
    join personae.work_relation_type ti on ti.code = t.inverse_code
    where r.to_work_id = w.id
  ) x;

  -- Similaires : genres partagés, puis proximité d'époque. Zéro ML (F-10).
  v_sim := array(
    select o.id from personae.work o
    join personae.work_genre og on og.work_id = o.id
    where o.id <> w.id
      and og.genre_id in (select genre_id from personae.work_genre where work_id = w.id)
    group by o.id, o.release_date
    order by count(*) desc, o.release_date desc nulls last, o.id
    limit 6);

  if v_user is not null then
    select * into v_propre from personae.review where work_id = w.id and user_id = v_user;
    select status into v_statut from personae.collection_entry where work_id = w.id and user_id = v_user;
  end if;

  return json_build_object(
    'id', w.id,
    'slug', w.slug,
    'title', w.title,
    'original_title', w.original_title,
    'type', w.work_type_code,
    'type_label', coalesce((select label from personae.work_type where code = w.work_type_code), w.work_type_code),
    'synopsis', w.synopsis,
    'release_date', w.release_date,
    'date_precision', coalesce(w.attributes ->> 'date_precision', 'day'),
    'original_language', w.original_language,
    'runtime_minutes', w.runtime_minutes,
    'attributes', w.attributes - 'slug' - 'date_precision',
    'genres', coalesce((
      select jsonb_agg(jsonb_build_object('slug', g.slug, 'label', g.label) order by g.sort_order)
      from personae.genre g join personae.work_genre wg on wg.genre_id = g.id
      where wg.work_id = w.id), '[]'::jsonb),
    'credits', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'full_name', p.full_name,
        'role', c.credit_role_code, 'character_name', c.character_name) order by c.display_order)
      from personae.credit c join personae.person p on p.id = c.person_id
      where c.work_id = w.id), '[]'::jsonb),
    'relations', v_rel,
    'similaires', personae.cartes(v_sim),
    'avis', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'rating', r.rating::text, 'body', r.body,
        'created_at', (r.created_at at time zone 'UTC')::date,
        'auteur_pseudo', u.pseudo, 'auteur_id', u.id) order by r.created_at desc)
      from personae.review r join personae.app_user u on u.id = r.user_id
      where r.work_id = w.id and r.status = 'publie'), '[]'::jsonb),
    'rating_average', v_note.moyenne,
    'rating_count', v_note.nombre,
    'distribution', personae.distribution(w.id),
    'source', (
      select jsonb_build_object('code', s.code, 'label', s.label, 'attribution_text', s.attribution_text)
      from personae.external_ref e join personae.external_source s on s.code = e.source_code
      where e.work_id = w.id limit 1),
    'ma_note', v_propre.rating::text,
    'mon_avis', v_propre.body,
    'mon_statut_collection', v_statut);
end $$;

-- GET /persons/{id} — filmographie groupée par rôle (F-07).
create or replace function public.api_person(p_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare p personae.person;
begin
  select * into p from personae.person where id = p_id;
  if p.id is null then
    raise exception using errcode = 'PT404', message = 'Personne introuvable.';
  end if;

  return json_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'bio', p.bio,
    'birth_date', p.birth_date,
    'death_date', p.death_date,
    -- json (et non jsonb) : conserve l'ordre des rôles.
    'filmographie', coalesce((
      select json_object_agg(x.label, x.cartes order by x.sort_order)
      from (
        select cr.label, cr.sort_order,
               personae.cartes(array_agg(c.work_id order by w.release_date desc nulls last, w.id)) as cartes
        from personae.credit c
        join personae.credit_role cr on cr.code = c.credit_role_code
        join personae.work w on w.id = c.work_id
        where c.person_id = p.id
        group by cr.label, cr.sort_order
      ) x), '{}'::json),
    'nb_oeuvres', (select count(distinct c.work_id) from personae.credit c where c.person_id = p.id));
end $$;

-- GET /accueil — sélections éditoriales + fil chronologique des comptes suivis.
create or replace function public.api_accueil(p_limite_activite integer default 12)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := personae.utilisateur_actif();
  v_limite integer := least(greatest(coalesce(p_limite_activite, 12), 1), 50);
  v_activite jsonb := '[]'::jsonb;
  v_decouverte jsonb := '[]'::jsonb;
begin
  if v_user is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
             'auteur_pseudo', x.pseudo, 'auteur_id', x.uid,
             'rating', x.rating::text, 'body', x.body,
             'created_at', (x.created_at at time zone 'UTC')::date,
             'work', personae.carte(x.work_id)) order by x.created_at desc), '[]'::jsonb)
      into v_activite
    from (
      select u.pseudo, u.id as uid, r.rating, r.body, r.created_at, r.work_id
      from personae.review r
      join personae.app_user u on u.id = r.user_id
      where r.status = 'publie'
        and r.user_id in (select followee_id from personae.follow where follower_id = v_user)
      order by r.created_at desc
      limit v_limite
    ) x;
  end if;

  if jsonb_array_length(v_activite) = 0 then
    -- Repli : mieux notées avec au moins deux avis.
    v_decouverte := personae.cartes(array(
      select r.work_id from personae.review r
      where r.status = 'publie'
      group by r.work_id
      having count(*) >= 2
      order by avg(r.rating) desc, r.work_id
      limit 12));
  end if;

  return json_build_object(
    'selections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', t.slug, 'label', t.label, 'description', t.description,
        'oeuvres', personae.cartes(array(
          select wt.work_id from personae.work_theme wt
          where wt.theme_id = t.id order by wt.position))) order by t.sort_order)
      from personae.theme t where t.is_published), '[]'::jsonb),
    'activite', v_activite,
    'decouverte', v_decouverte);
end $$;

-- GET /users/{id}/profil — chaque chiffre est calculé, aucun n'est stocké.
create or replace function public.api_profil(p_user_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  u personae.app_user;
  v_visiteur uuid := personae.utilisateur_actif();
begin
  select * into u from personae.app_user where id = p_user_id;
  if u.id is null or not u.is_active then
    raise exception using errcode = 'PT404', message = 'Profil introuvable.';
  end if;

  return json_build_object(
    'id', u.id,
    'pseudo', u.pseudo,
    'display_name', u.display_name,
    'bio', u.bio,
    'nb_avis', (select count(*) from personae.review where user_id = u.id and status = 'publie'),
    'nb_collection', (select count(*) from personae.collection_entry where user_id = u.id),
    'nb_vus', (select count(*) from personae.collection_entry where user_id = u.id and status = 'consumed'),
    'note_moyenne', (select round(avg(rating), 1)::text from personae.review where user_id = u.id and status = 'publie'),
    'repartition', coalesce((
      select json_object_agg(x.label, x.nb order by x.sort_order)
      from (
        select t.label, t.sort_order, count(*) as nb
        from personae.collection_entry e
        join personae.work w on w.id = e.work_id
        join personae.work_type t on t.code = w.work_type_code
        where e.user_id = u.id
        group by t.label, t.sort_order
      ) x), '{}'::json),
    'coups_de_coeur', personae.cartes(array(
      select e.work_id from personae.collection_entry e
      where e.user_id = u.id and e.is_highlight
      order by e.added_at desc, e.work_id limit 8)),
    'nb_abonnements', (select count(*) from personae.follow where follower_id = u.id),
    'nb_abonnes', (select count(*) from personae.follow where followee_id = u.id),
    'je_le_suis', case
      when v_visiteur is null or v_visiteur = u.id then null
      else exists (select 1 from personae.follow where follower_id = v_visiteur and followee_id = u.id)
    end);
end $$;

-- ---------------------------------------------------------------- connecté

-- GET /collection?type=&statut=&coup_de_coeur=
create or replace function public.api_collection(
  p_type text default null,
  p_statut text default null,
  p_coup_de_coeur boolean default false)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := personae.exiger_utilisateur();
  v_items jsonb;
begin
  if p_statut is not null and p_statut not in ('to_consume', 'consumed', 'dropped') then
    raise exception using errcode = 'PT400', message = 'Les données saisies sont invalides.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', e.id, 'statut', e.status,
           'is_favorite', e.is_favorite, 'is_highlight', e.is_highlight,
           'consumed_at', (e.consumed_at at time zone 'UTC')::date,
           'work', personae.carte(e.work_id)) order by e.added_at desc, e.id), '[]'::jsonb)
    into v_items
  from personae.collection_entry e
  join personae.work w on w.id = e.work_id
  where e.user_id = v_user
    and (p_type is null or w.work_type_code = p_type)
    and (p_statut is null or e.status = p_statut)
    and (not coalesce(p_coup_de_coeur, false) or e.is_highlight);

  return json_build_object('items', v_items, 'total', jsonb_array_length(v_items));
end $$;

-- PUT /works/{slug}/collection
create or replace function public.api_collection_enregistrer(
  p_slug text,
  p_statut text,
  p_is_favorite boolean default false,
  p_is_highlight boolean default false)
returns json
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := personae.exiger_utilisateur();
  v_work uuid := personae.oeuvre_par_slug(p_slug);
  e personae.collection_entry;
begin
  if p_statut is null or p_statut not in ('to_consume', 'consumed', 'dropped') then
    raise exception using errcode = 'PT400', message = 'Les données saisies sont invalides.';
  end if;

  insert into personae.collection_entry (user_id, work_id, status, is_favorite, is_highlight, consumed_at)
  values (v_user, v_work, p_statut, coalesce(p_is_favorite, false), coalesce(p_is_highlight, false),
          case when p_statut = 'consumed' then now() end)
  on conflict (user_id, work_id) do update set
    status = excluded.status,
    is_favorite = excluded.is_favorite,
    is_highlight = excluded.is_highlight,
    -- Une œuvre déjà « vue » garde sa date d'origine.
    consumed_at = case
      when excluded.status <> 'consumed' then null
      when personae.collection_entry.status = 'consumed' then personae.collection_entry.consumed_at
      else now() end
  returning * into e;

  return json_build_object('statut', e.status, 'is_favorite', e.is_favorite, 'is_highlight', e.is_highlight);
end $$;

-- DELETE /works/{slug}/collection
create or replace function public.api_collection_retirer(p_slug text)
returns json
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := personae.exiger_utilisateur();
  v_work uuid := personae.oeuvre_par_slug(p_slug);
begin
  delete from personae.collection_entry where user_id = v_user and work_id = v_work;
  if not found then
    raise exception using errcode = 'PT404', message = 'Cette œuvre n''est pas dans votre collection.';
  end if;
  return json_build_object('message', 'Retiré de la collection.');
end $$;

-- PUT /works/{slug}/avis — un avis par compte et par œuvre, idempotent.
create or replace function public.api_avis_enregistrer(p_slug text, p_rating numeric, p_body text default null)
returns json
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := personae.exiger_utilisateur();
  v_work uuid := personae.oeuvre_par_slug(p_slug);
  v_body text := nullif(btrim(p_body), '');
  r personae.review;
  v_note record;
begin
  if p_rating is null or p_rating < 0 or p_rating > 10 or p_rating <> round(p_rating, 1) then
    raise exception using errcode = 'PT400', message = 'La note doit être comprise entre 0 et 10, au dixième près.';
  end if;
  if v_body is not null and length(v_body) > 5000 then
    raise exception using errcode = 'PT400', message = 'L''avis ne peut pas dépasser 5 000 caractères.';
  end if;

  insert into personae.review (user_id, work_id, rating, body, status)
  values (v_user, v_work, p_rating, v_body, 'publie')
  on conflict (user_id, work_id) do update set
    rating = excluded.rating, body = excluded.body, updated_at = now()
  returning * into r;

  -- Moyenne RECALCULÉE, jamais incrémentée.
  select * into v_note from personae.note(v_work);
  return json_build_object(
    'rating', r.rating::text,
    'body', r.body,
    'rating_average', v_note.moyenne,
    'rating_count', v_note.nombre,
    'distribution', personae.distribution(v_work));
end $$;

-- DELETE /works/{slug}/avis
create or replace function public.api_avis_supprimer(p_slug text)
returns json
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := personae.exiger_utilisateur();
  v_work uuid := personae.oeuvre_par_slug(p_slug);
begin
  delete from personae.review where user_id = v_user and work_id = v_work;
  if not found then
    raise exception using errcode = 'PT404', message = 'Aucun avis à supprimer.';
  end if;
  return json_build_object('message', 'Avis supprimé.');
end $$;

-- ---------------------------------------------------------------- droits
-- Par défaut PostgreSQL accorde EXECUTE à PUBLIC sur toute fonction : on
-- retire tout, puis on n'ouvre que la surface voulue.
revoke all on all functions in schema personae from public, anon, authenticated;

revoke all on function
  public.api_config(), public.api_session(), public.api_types(), public.api_genres(text),
  public.api_works(text, text, text, integer, integer), public.api_work(text),
  public.api_person(uuid), public.api_accueil(integer), public.api_profil(uuid),
  public.api_collection(text, text, boolean),
  public.api_collection_enregistrer(text, text, boolean, boolean),
  public.api_collection_retirer(text),
  public.api_avis_enregistrer(text, numeric, text), public.api_avis_supprimer(text)
from public, anon, authenticated;

-- Lecture : visiteurs anonymes et connectés.
grant execute on function
  public.api_config(), public.api_session(), public.api_types(), public.api_genres(text),
  public.api_works(text, text, text, integer, integer), public.api_work(text),
  public.api_person(uuid), public.api_accueil(integer), public.api_profil(uuid)
to anon, authenticated;

-- Écriture et données personnelles : connectés uniquement (et la fonction
-- revérifie elle-même le compte actif).
grant execute on function
  public.api_collection(text, text, boolean),
  public.api_collection_enregistrer(text, text, boolean, boolean),
  public.api_collection_retirer(text),
  public.api_avis_enregistrer(text, numeric, text), public.api_avis_supprimer(text)
to authenticated;
