/** Types miroirs des schémas de l'API (`backend/app/schemas/`). */

export type WorkBref = {
  id: string
  slug: string
  title: string
  type: string
  type_label: string
  release_year: number | null
  rating_average: string | null
  rating_count: number
}

export type PersonBref = {
  id: string
  full_name: string
  role: string | null
  character_name: string | null
}

export type Genre = { slug: string; label: string }

export type Avis = {
  id: string
  rating: string
  body: string | null
  created_at: string
  auteur_pseudo: string
  auteur_id: string
}

export type Relation = { label: string; work: WorkBref }

export type WorkDetail = {
  id: string
  slug: string
  title: string
  original_title: string | null
  type: string
  type_label: string
  synopsis: string | null
  release_date: string | null
  date_precision: string
  original_language: string | null
  runtime_minutes: number | null
  attributes: Record<string, unknown>
  genres: Genre[]
  credits: PersonBref[]
  relations: Relation[]
  similaires: WorkBref[]
  avis: Avis[]
  rating_average: string | null
  rating_count: number
  distribution: { tranche: number; nombre: number }[]
  source: { code: string; label: string; attribution_text: string } | null
  ma_note: string | null
  mon_avis: string | null
  mon_statut_collection: string | null
}

export type PersonDetail = {
  id: string
  full_name: string
  bio: string | null
  birth_date: string | null
  death_date: string | null
  filmographie: Record<string, WorkBref[]>
  nb_oeuvres: number
}

export type Utilisateur = {
  id: string
  pseudo: string
  display_name: string | null
  bio: string | null
  is_superadmin: boolean
}

export type Profil = {
  id: string
  pseudo: string
  display_name: string | null
  bio: string | null
  nb_avis: number
  nb_collection: number
  nb_vus: number
  note_moyenne: string | null
  repartition: Record<string, number>
  coups_de_coeur: WorkBref[]
  nb_abonnements: number
  nb_abonnes: number
  je_le_suis: boolean | null
}

export type EntreeCollection = {
  id: string
  statut: string
  is_favorite: boolean
  is_highlight: boolean
  consumed_at: string | null
  work: WorkBref
}

export type Activite = {
  auteur_pseudo: string
  auteur_id: string
  rating: string
  body: string | null
  created_at: string
  work: WorkBref
}

export type Theme = {
  slug: string
  label: string
  description: string | null
  oeuvres: WorkBref[]
}

export type Accueil = {
  selections: Theme[]
  activite: Activite[]
  decouverte: WorkBref[]
}

export type Liste<T> = {
  items: T[]
  total: number
  limite: number
  decalage: number
}
