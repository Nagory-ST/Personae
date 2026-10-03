/**
 * Client de l'API Personae — version Supabase.
 *
 * Les écrans appellent toujours `api.get('/works/la-la-land')` comme du temps de
 * l'API FastAPI : ce module traduit chaque chemin en appel de fonction
 * PostgreSQL (`supabase.rpc('api_work', …)`). Les fonctions renvoient le MÊME
 * JSON que l'ancienne API, si bien qu'aucun écran n'a eu à changer sa lecture
 * des données. La table de correspondance est `ROUTES`, plus bas.
 *
 * Sécurité :
 *   - la clé embarquée est la clé PUBLIABLE (anon) : elle n'ouvre que les
 *     fonctions `api_*` explicitement accordées au rôle `anon`. Les tables
 *     vivent dans un schéma privé que l'API REST n'expose pas ;
 *   - l'identité n'est JAMAIS un paramètre : chaque fonction la lit dans le
 *     jeton signé par Supabase Auth (`auth.uid()`).
 *
 * Toutes les erreurs remontent sous la forme d'un `ErreurApi` porteur d'un code
 * HTTP et d'un message **en français, destiné à être affiché**. Aucune trace
 * technique ne doit atteindre l'écran.
 */

import { createClient } from '@supabase/supabase-js'

export class ErreurApi extends Error {
  constructor(
    public readonly statut: number,
    message: string,
  ) {
    super(message)
    this.name = 'ErreurApi'
  }

  /** Vrai quand l'erreur signifie « il faut se connecter ». */
  get estNonAutorise(): boolean {
    return this.statut === 401
  }

  get estIntrouvable(): boolean {
    return this.statut === 404
  }
}

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const CLE_PUBLIABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!URL_SUPABASE || !CLE_PUBLIABLE) {
  // Fail-fast au build comme à l'exécution : un front sans backend configuré
  // ne doit pas partir en ligne en affichant des écrans vides.
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY sont requis.',
  )
}

export const supabase = createClient(URL_SUPABASE, CLE_PUBLIABLE, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})

type Corps = Record<string, unknown>
type Route = {
  methode: 'GET' | 'POST' | 'PUT' | 'DELETE'
  motif: RegExp
  /** Construit l'appel ; `m` = captures du motif, `q` = paramètres de requête. */
  appel: (m: string[], q: URLSearchParams, corps: Corps) => Promise<unknown>
}

/** Appelle une fonction `api_*` et convertit l'erreur PostgREST en `ErreurApi`. */
async function rpc(fonction: string, args: Corps = {}): Promise<unknown> {
  // Les paramètres absents partent en `undefined` : la fonction SQL applique
  // alors sa valeur par défaut.
  const nettoyes = Object.fromEntries(
    Object.entries(args).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
  let resultat
  try {
    resultat = await supabase.rpc(fonction, nettoyes)
  } catch {
    throw new ErreurApi(0, 'Le service ne répond pas. Réessayez dans un instant.')
  }
  const { data, error, status } = resultat
  if (error) {
    // Les fonctions lèvent des codes `PTxxx` → statut HTTP xxx, avec un
    // message déjà rédigé pour l'écran. Tout autre code reste générique : on
    // n'affiche jamais un message technique de PostgreSQL.
    const metier = /^PT\d{3}$/.test(error.code ?? '')
    throw new ErreurApi(
      metier ? Number(error.code.slice(2)) : status || 500,
      metier ? error.message : 'Une erreur est survenue.',
    )
  }
  return data
}

const segment = '([^/?]+)'

const ROUTES: Route[] = [
  { methode: 'GET', motif: /^\/config$/, appel: () => rpc('api_config') },
  { methode: 'GET', motif: /^\/auth\/session$/, appel: () => rpc('api_session') },
  { methode: 'GET', motif: /^\/types$/, appel: () => rpc('api_types') },
  {
    methode: 'GET',
    motif: /^\/genres$/,
    appel: (_, q) => rpc('api_genres', { p_type: q.get('type') }),
  },
  {
    methode: 'GET',
    motif: /^\/works$/,
    appel: (_, q) =>
      rpc('api_works', {
        p_type: q.get('type'),
        p_genre: q.get('genre'),
        p_tri: q.get('tri'),
        p_limite: q.get('limite') ? Number(q.get('limite')) : undefined,
        p_decalage: q.get('decalage') ? Number(q.get('decalage')) : undefined,
      }),
  },
  {
    methode: 'GET',
    motif: new RegExp(`^/works/${segment}$`),
    appel: ([slug]) => rpc('api_work', { p_slug: slug }),
  },
  {
    methode: 'PUT',
    motif: new RegExp(`^/works/${segment}/avis$`),
    appel: ([slug], _, c) =>
      rpc('api_avis_enregistrer', { p_slug: slug, p_rating: c.rating, p_body: c.body }),
  },
  {
    methode: 'DELETE',
    motif: new RegExp(`^/works/${segment}/avis$`),
    appel: ([slug]) => rpc('api_avis_supprimer', { p_slug: slug }),
  },
  {
    methode: 'PUT',
    motif: new RegExp(`^/works/${segment}/collection$`),
    appel: ([slug], _, c) =>
      rpc('api_collection_enregistrer', {
        p_slug: slug,
        p_statut: c.statut,
        p_is_favorite: c.is_favorite,
        p_is_highlight: c.is_highlight,
      }),
  },
  {
    methode: 'DELETE',
    motif: new RegExp(`^/works/${segment}/collection$`),
    appel: ([slug]) => rpc('api_collection_retirer', { p_slug: slug }),
  },
  {
    methode: 'GET',
    motif: /^\/collection$/,
    appel: (_, q) =>
      rpc('api_collection', {
        p_type: q.get('type'),
        p_statut: q.get('statut'),
        p_coup_de_coeur: q.get('coup_de_coeur') === 'true' ? true : undefined,
      }),
  },
  {
    methode: 'GET',
    motif: new RegExp(`^/persons/${segment}$`),
    appel: ([id]) => rpc('api_person', { p_id: id }),
  },
  {
    methode: 'GET',
    motif: new RegExp(`^/users/${segment}/profil$`),
    appel: ([id]) => rpc('api_profil', { p_user_id: id }),
  },
  { methode: 'GET', motif: /^\/accueil$/, appel: () => rpc('api_accueil') },
  {
    methode: 'POST',
    motif: /^\/auth\/connexion$/,
    appel: async (_, __, c) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: String(c.email ?? ''),
        password: String(c.mot_de_passe ?? ''),
      })
      if (error) {
        // Message volontairement unique : ne pas dire si c'est l'adresse ou
        // le mot de passe qui est faux (énumération de comptes).
        throw new ErreurApi(
          error.status === 429 ? 429 : 401,
          error.status === 429
            ? 'Trop de tentatives. Patientez quelques minutes.'
            : 'Adresse ou mot de passe incorrect.',
        )
      }
      return rpc('api_session')
    },
  },
  {
    methode: 'POST',
    motif: /^\/auth\/deconnexion$/,
    appel: async () => {
      await supabase.auth.signOut()
      return { message: 'Déconnecté.' }
    },
  },
]

async function requete<T>(
  methode: Route['methode'],
  chemin: string,
  corps: Corps = {},
): Promise<T> {
  const [base, chaine = ''] = chemin.split('?')
  const q = new URLSearchParams(chaine)
  for (const route of ROUTES) {
    if (route.methode !== methode) continue
    const m = base.match(route.motif)
    if (m) {
      const captures = m.slice(1).map((s) => decodeURIComponent(s))
      return (await route.appel(captures, q, corps)) as T
    }
  }
  throw new ErreurApi(404, 'Ressource introuvable.')
}

export const api = {
  get: <T>(chemin: string) => requete<T>('GET', chemin),
  post: <T>(chemin: string, corps?: Corps) => requete<T>('POST', chemin, corps),
  put: <T>(chemin: string, corps?: Corps) => requete<T>('PUT', chemin, corps),
  delete: <T>(chemin: string) => requete<T>('DELETE', chemin),
}

/** Formate une note pour l'affichage : 8.4 -> « 8,4 », null -> « — ». */
export function formaterNote(note: string | number | null | undefined): string {
  if (note === null || note === undefined) return '—'
  return String(note).replace('.', ',')
}

/**
 * Formate une date de sortie selon la précision RÉELLEMENT connue.
 *
 * Un livre dont on ne connaît que l'année ne doit pas afficher un 1er janvier
 * inventé : on montre l'année seule. Ne pas fabriquer une précision qu'on n'a pas.
 */
export function formaterDate(
  date: string | null,
  precision: string = 'day',
): string {
  if (!date) return '—'
  const annee = date.slice(0, 4)
  if (precision === 'year') return annee
  const [, mois, jour] = date.split('-')
  return `${jour}/${mois}/${annee}`
}
