/**
 * Explorer — écran 2 du scénario.
 *
 * Navigation par domaine et par genre, avec des tris de facettes légers.
 * Arborescence **plate**, conformément au brief qui demande explicitement de
 * ne pas l'alourdir : les facettes remplacent les sous-catégories.
 */

'use client'

import { useEffect, useState } from 'react'
import { EtatChargement, EtatErreur, EtatVide } from '@/components/Etats'
import { GrilleOeuvres } from '@/components/WorkCard'
import { api } from '@/lib/api'
import type { Genre, Liste, WorkBref } from '@/lib/types'

type TypeOeuvre = { code: string; label: string }

const TRIS = [
  { code: 'recent', libelle: 'Plus récent' },
  { code: 'ancien', libelle: 'Plus ancien' },
  { code: 'note', libelle: 'Mieux noté' },
  { code: 'titre', libelle: 'Titre' },
] as const

export default function PageExplorer() {
  const [types, setTypes] = useState<TypeOeuvre[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [typeActif, setTypeActif] = useState<string | null>(null)
  const [genreActif, setGenreActif] = useState<string | null>(null)
  const [tri, setTri] = useState<string>('recent')
  const [resultat, setResultat] = useState<Liste<WorkBref> | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    api.get<TypeOeuvre[]>('/types').then(setTypes).catch(() => setTypes([]))
  }, [])

  useEffect(() => {
    const requete = typeActif ? `/genres?type=${typeActif}` : '/genres'
    api.get<Genre[]>(requete).then((liste) => {
      setGenres(liste)
      // Un genre qui n'existe plus dans le domaine choisi doit être relâché,
      // sinon la liste reste vide sans que l'utilisateur comprenne pourquoi.
      setGenreActif((actuel) =>
        actuel && liste.some((g) => g.slug === actuel) ? actuel : null,
      )
    })
  }, [typeActif])

  useEffect(() => {
    const parametres = new URLSearchParams({ tri, limite: '48' })
    if (typeActif) parametres.set('type', typeActif)
    if (genreActif) parametres.set('genre', genreActif)
    setResultat(null)
    api
      .get<Liste<WorkBref>>(`/works?${parametres}`)
      .then(setResultat)
      .catch((e) => setErreur(e.message))
  }, [typeActif, genreActif, tri])

  if (erreur) return <EtatErreur message={erreur} />

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-6)' }}>
      <h1
        className="font-display"
        style={{ fontSize: 'var(--text-display)', fontWeight: 700 }}
      >
        Explorer
      </h1>

      <div className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
        <Facettes
          libelle="Domaine"
          options={[{ code: '', label: 'Tout' }, ...types.map((t) => ({ code: t.code, label: t.label }))]}
          actif={typeActif ?? ''}
          onChoisir={(code) => setTypeActif(code || null)}
        />
        <Facettes
          libelle="Genre"
          options={[{ code: '', label: 'Tous' }, ...genres.map((g) => ({ code: g.slug, label: g.label }))]}
          actif={genreActif ?? ''}
          onChoisir={(code) => setGenreActif(code || null)}
        />
        <Facettes
          libelle="Trier par"
          options={TRIS.map((t) => ({ code: t.code, label: t.libelle }))}
          actif={tri}
          onChoisir={setTri}
        />
      </div>

      {/* Le compteur porte sur ce qui est RÉELLEMENT affiché, pas sur un total
          global : c'est le défaut relevé dans les maquettes (« 58 séries »
          au-dessus d'une liste vide). */}
      {resultat && (
        <p style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-secondary)' }}>
          {resultat.total} œuvre{resultat.total > 1 ? 's' : ''}
          {typeActif || genreActif ? ' correspondant à ces filtres' : ' au catalogue'}
        </p>
      )}

      {!resultat ? (
        <EtatChargement lignes={3} />
      ) : resultat.items.length === 0 ? (
        <EtatVide
          titre="Aucune œuvre pour ces filtres"
          message="Essayez un autre genre, ou élargissez le domaine."
        />
      ) : (
        <GrilleOeuvres oeuvres={resultat.items} />
      )}
    </div>
  )
}

function Facettes({
  libelle,
  options,
  actif,
  onChoisir,
}: {
  libelle: string
  options: { code: string; label: string }[]
  actif: string
  onChoisir: (code: string) => void
}) {
  return (
    <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
      <span
        className="uppercase"
        style={{
          fontSize: 'var(--text-micro)',
          letterSpacing: 'var(--tracking-micro)',
          color: 'var(--color-text-secondary)',
          minWidth: 76,
        }}
      >
        {libelle}
      </span>
      <div className="flex flex-wrap" style={{ gap: 'var(--space-2)' }}>
        {options.map((option) => {
          const choisi = option.code === actif
          return (
            <button
              key={option.code || 'tout'}
              type="button"
              onClick={() => onChoisir(option.code)}
              aria-pressed={choisi}
              className="rounded-sm border transition-colors"
              style={{
                padding: 'var(--tag-padding)',
                fontSize: 'var(--text-meta)',
                borderColor: choisi ? 'var(--color-accent)' : 'var(--color-border)',
                color: choisi ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                background: choisi ? 'var(--color-surface-glass)' : 'transparent',
              }}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
