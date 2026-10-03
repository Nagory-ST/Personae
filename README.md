# Personae — démo web

Films, séries et livres au même endroit : noter, tenir sa collection, tirer le fil d'une œuvre à
l'autre (du livre à son adaptation, de l'adaptation à son auteur).

**Démonstration** — données fictives (comptes) et métadonnées factuelles libres (œuvres, personnes).
Ce n'est pas un service ouvert : l'inscription est fermée.

## Architecture

| Couche | Techno | Où |
|---|---|---|
| Front | Next.js 14, export statique | GitHub Pages — `frontend/` |
| API | 14 fonctions PostgreSQL `public.api_*` appelées en RPC | Supabase — `supabase/migrations/` |
| Données | PostgreSQL, schéma privé `personae` (non exposé) | Supabase |
| Comptes | Supabase Auth | Supabase |

Le front appelle `api.get('/works/<slug>')`, que `frontend/src/lib/api.ts` traduit en
`supabase.rpc('api_work', …)`. Les fonctions renvoient le même JSON que l'API FastAPI d'origine.

Sécurité : voir **[SECURITE.md](SECURITE.md)**.

## Installation (une fois)

1. **Supabase** — appliquer dans l'ordre `supabase/migrations/*.sql`, puis charger le jeu
   (`supabase/jeu/*.json` dans `personae.jeu_source`) et exécuter
   `supabase/jeu/installer-communaute.sql` dans le SQL Editor. Le mot de passe des comptes de
   démonstration est généré et affiché **une seule fois** : il n'est écrit nulle part dans ce dépôt.
2. **Supabase Auth** — désactiver l'inscription (*Allow new users to sign up*).
3. **GitHub** — Settings → Pages → Source : **GitHub Actions**. Chaque push sur `main` publie.

## Développement local

```bash
cd frontend
npm install
NEXT_PUBLIC_SUPABASE_URL=https://byakeeekgzbgzjjnifed.supabase.co \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
npm run dev
```

## Remise à zéro

Le contenu écrit par les visiteurs est effacé chaque nuit à 03:00 UTC (`personae.charger_jeu()`
via pg_cron). Manuellement : `select personae.charger_jeu();` dans le SQL Editor.
