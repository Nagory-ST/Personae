-- =============================================================================
-- Personae — comptes invités (personnes réelles autorisées sur la démo).
--
-- L'inscription est fermée : un compte Supabase Auth n'ouvre rien sans profil
-- `personae.app_user`. Pour donner accès à une vraie personne, Kévin crée le
-- compte Auth dans le dashboard, puis on l'inscrit ici.
--
-- Pourquoi une table à part : `charger_jeu()` vide `app_user` chaque nuit et
-- ne recharge que les 4 comptes fictifs. `reinitialiser()` recharge le jeu
-- PUIS réinstalle les profils invités — leur accès survit à la remise à zéro,
-- leurs avis et collections non (même règle que les comptes fictifs).
--
-- Minimisation (RGPD) : ni e-mail ni nom ici — l'e-mail reste dans auth.users,
-- seul le pseudo public est stocké. Supprimer le compte Auth supprime en
-- cascade la ligne invitée et le profil.
-- =============================================================================

create table personae.compte_invite (
  id            uuid primary key references auth.users(id) on delete cascade,
  pseudo        varchar(50) not null,
  display_name  varchar(100),
  ajoute_le     timestamptz not null default now()
);
alter table personae.compte_invite enable row level security;
revoke all on personae.compte_invite from public, anon, authenticated;

create or replace function personae.reinitialiser()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare v_bilan text;
begin
  v_bilan := personae.charger_jeu();
  insert into personae.app_user (id, pseudo, display_name, is_active, is_superadmin)
  select c.id, c.pseudo, c.display_name, true, false
  from personae.compte_invite c
  where exists (select 1 from auth.users a where a.id = c.id)
  on conflict (id) do nothing;
  return v_bilan || format(' · %s invité(s)', (select count(*) from personae.compte_invite));
end $$;

revoke all on function personae.reinitialiser() from public, anon, authenticated;

-- La tâche nocturne passe par reinitialiser() (et non plus charger_jeu()).
select cron.unschedule('personae-reset-nuit')
where exists (select 1 from cron.job where jobname = 'personae-reset-nuit');
select cron.schedule('personae-reset-nuit', '0 3 * * *', 'select personae.reinitialiser()');
