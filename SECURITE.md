# Personae — analyse de sécurité de la démo publique

> Analyse du 03/10/2026, sur la cible **exposée** : front sur GitHub Pages, back sur Supabase
> (projet `byakeeekgzbgzjjnifed`, Francfort).
> Périmètre : démo publique, données fictives, inscription fermée. **Pas une mise en production** :
> le GATE PRODUCTION de l'armée n'est pas passé et ne doit pas être considéré comme passé.

## 1. Architecture et surface d'attaque

```
Navigateur ──HTTPS──> GitHub Pages (HTML/JS statique, aucun secret)
     │
     └──HTTPS──> Supabase
                  ├─ /auth/v1      Supabase Auth (e-mail + mot de passe)
                  ├─ /rest/v1/rpc  14 fonctions public.api_*  ← SEULE surface de données
                  └─ schéma privé `personae` (tables) — NON exposé
```

| Élément exposé | Qui peut l'appeler | Contrôle |
|---|---|---|
| 9 fonctions de lecture (`api_config`, `api_session`, `api_types`, `api_genres`, `api_works`, `api_work`, `api_person`, `api_accueil`, `api_profil`) | `anon`, `authenticated` | lecture seule, aucune donnée personnelle renvoyée |
| 5 fonctions d'écriture / perso (`api_collection*`, `api_avis_*`) | `authenticated` uniquement | `auth.uid()` + ligne `app_user` active exigée **dans** la fonction |
| Tables | personne | schéma `personae` hors API + RLS activée sans policy + `REVOKE ALL` |
| Fonctions internes (`charger_jeu`, `creer_comptes_demo`…) | personne | schéma privé + `REVOKE EXECUTE` |

## 2. Tests exécutés (preuves, 03/10/2026, avec la clé publiable)

| # | Test | Attendu | Observé | Verdict |
|---|---|---|---|---|
| 1 | Lire une table directement (`/rest/v1/work`) | refus | `404 PGRST205` | ✅ |
| 2 | Forcer le schéma privé (`Accept-Profile: personae`) | refus | `406 PGRST106` (seuls `public`, `graphql_public` exposés) | ✅ |
| 3 | `api_config` en anonyme | 200 | `200` inscription fermée, aide masquée | ✅ |
| 4 | `api_session` en anonyme | `null` | `200 null` | ✅ |
| 5 | `api_collection` en anonyme | refus | `401 permission denied` | ✅ |
| 6 | Écrire un avis en anonyme | refus | `401 permission denied` | ✅ |
| 7 | Appeler `charger_jeu` (fonction interne) | introuvable | `404 PGRST202` | ✅ |
| 8 | Injection SQL dans le slug (`x' or 1=1--`) | 404 propre | `404 PT404 « Œuvre introuvable. »` | ✅ |
| 9 | Paramètre de tri arbitraire | 400 propre | `400 PT400` | ✅ |
| 10 | GraphQL | fermé | extension `pg_graphql` non activée | ✅ |
| 11 | Réglages Auth | inscription fermée | **`disable_signup: false`** | ⚠️ voir §4-A |

**Non testé (comptes pas encore créés)** : écriture authentifiée, impossibilité d'écrire au nom d'un
autre, refus d'un compte Auth sans ligne `app_user`. Ces garanties sont **par construction** (l'identité
vient uniquement de `auth.uid()`, jamais d'un paramètre). → À re-prouver après l'installation des
comptes (checklist §5).

## 3. Advisors Supabase

- **WARN `anon/authenticated_security_definer_function_executable`** (14 fonctions) — **voulu**. Ces
  fonctions SONT l'API : elles s'exécutent avec les droits du propriétaire pour lire le schéma privé,
  avec `search_path = ''`, des noms qualifiés, une identité tirée du JWT et des entrées validées.
  C'est le modèle « API par RPC » : il remplace des policies RLS sur des tables exposées.
- **INFO `rls_enabled_no_policy`** (19 tables) — **voulu** : refus total pour tout accès direct.
- **Aucun** `rls_disabled_in_public`, `function_search_path_mutable`, `security_definer_view`.
- Performance : 5 clés étrangères sans index sur des tables de référence de moins de 10 lignes —
  sans impact à cette échelle.

## 4. Risques résiduels — par gravité

| ID | Gravité | Risque | Mesure |
|---|---|---|---|
| A | **MAJEURE** tant que non fait | Inscription Supabase ouverte : n'importe qui peut créer un compte Auth (sans pouvoir écrire : pas de ligne `app_user`) et faire envoyer des e-mails de confirmation | **Kévin** : Dashboard → Authentication → Sign In / Providers → décocher *Allow new users to sign up* |
| B | MOYENNE | Le jeton de session vit en `localStorage` (supabase-js), alors que l'ADR D-12 imposait un cookie `httpOnly`. Un XSS pourrait le lire | React échappe tout (aucun `dangerouslySetInnerHTML`) ; la CSP limite `connect-src` au seul Supabase (pas d'exfiltration vers un tiers) ; comptes fictifs uniquement |
| C | MOYENNE | CSP posée par `<meta>` (GitHub Pages ne permet aucun en-tête) : `frame-ancestors` ignoré, donc pas de protection anti-clickjacking ; `'unsafe-inline'` nécessaire aux scripts Next | Accepté pour une démo. En production : hébergeur qui permet les en-têtes (Cloudflare Pages, Netlify) + nonce |
| D | MOYENNE | Un détenteur du mot de passe démo peut écrire des avis visibles de tous (contenu inapproprié) | Mot de passe aléatoire, jamais publié, transmis hors du site ; avis bornés (1 par œuvre et par compte, 5 000 caractères) ; **remise à zéro chaque nuit** (pg_cron) |
| E | FAIBLE | Abus de lecture (scraping, charge) | Données publiques et fictives ; limites de l'offre gratuite Supabase. Aucun rate-limit applicatif sur les RPC |
| F | FAIBLE | Google Fonts : l'IP du visiteur part chez Google (RGPD, cf. jurisprudence allemande 2022) | Dette L9 existante : héberger les polices localement |
| G | FAIBLE | Projet Supabase gratuit mis en pause après 7 jours d'inactivité → démo hors service | Le relancer avant chaque présentation |
| H | INFO | Clé publiable et URL Supabase visibles dans le dépôt et le JS | **Public par conception.** Le workflow refuse de publier si une clé `service_role` / `sb_secret_` apparaît dans le build |

## 5. Checklist avant de partager le lien

- [ ] §4-A : inscription fermée dans le dashboard, puis `curl …/auth/v1/settings` → `"disable_signup":true`
- [ ] `supabase/jeu/installer-communaute.sql` exécuté, mot de passe noté
- [ ] Connexion avec `alexandre@example.org` OK, note posée, moyenne recalculée
- [ ] Avec un jeton valide, tenter d'écrire au nom d'un autre : impossible (aucun paramètre d'identité)
- [ ] `cron.job` contient `personae-reset-nuit`
- [ ] Re-lancer les advisors après toute migration

## 6. Ce qui n'a PAS été fait (honnêteté de périmètre)

- Pas d'audit `gest-audit-cyber` indépendant : cette analyse est celle de l'auteur du portage.
- Pas de test front automatisé, pas de test navigateur réel du site publié (Node absent du poste au 03/10).
- Tables non portées (admin, signalements, consentements, effacement RGPD) : **aucun droit
  d'effacement self-service** n'existe sur cette démo. Acceptable uniquement parce que tous les
  comptes sont fictifs et l'inscription fermée.
