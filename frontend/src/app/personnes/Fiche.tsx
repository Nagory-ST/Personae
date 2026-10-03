/**
 * Fiche Personne — écran 4 du scénario, et le croisement inter-domaines.
 *
 * C'est là qu'un auteur montre ses livres ET les films qui en sont tirés. La
 * filmographie est groupée par rôle : quelqu'un qui écrit et réalise apparaît
 * dans deux sections, pas dans une liste indifférenciée.
 *
 * **Aucune photo** : le droit à l'image est traité par l'absence (CDC §8). La
 * fiche s'appuie sur la typographie, comme les maquettes le faisaient déjà.
 */

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { EnTeteSection } from '@/components/AppShell'
import { EtatChargement, EtatErreur, EtatVide } from '@/components/Etats'
import { Icon } from '@/components/Icon'
import { GrilleOeuvres } from '@/components/WorkCard'
import { api, type ErreurApi } from '@/lib/api'
import type { PersonDetail } from '@/lib/types'

export function FichePersonne() {
  const id = useSearchParams().get('id') ?? ''
  const router = useRouter()
  const [personne, setPersonne] = useState<PersonDetail | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<PersonDetail>(`/persons/${id}`)
      .then(setPersonne)
      .catch((e: ErreurApi) => setErreur(e.message))
  }, [id])

  if (erreur) {
    return erreur.includes('introuvable') ? (
      <EtatVide
        titre="Cette personne n'est pas au catalogue"
        message="Elle ne fait pas partie du jeu de démonstration."
        action={{ libelle: 'Explorer le catalogue', href: '/explorer' }}
      />
    ) : (
      <EtatErreur message={erreur} />
    )
  }
  if (!personne) return <EtatChargement lignes={3} />

  const annees = [
    personne.birth_date?.slice(0, 4),
    personne.death_date?.slice(0, 4),
  ]

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-12)' }}>
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center self-start"
        style={{
          gap: 'var(--space-2)',
          fontSize: 'var(--text-ui)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <Icon nom="back" taille={16} />
        Retour
      </button>

      <header className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
        <h1
          className="font-display"
          style={{
            fontSize: 'var(--text-display)',
            fontWeight: 700,
            letterSpacing: 'var(--tracking-title)',
          }}
        >
          {personne.full_name}
        </h1>
        <p style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-secondary)' }}>
          {annees[0] ? (annees[1] ? `${annees[0]} — ${annees[1]}` : `né·e en ${annees[0]}`) : 'Dates inconnues'}
          {' · '}
          {personne.nb_oeuvres} œuvre{personne.nb_oeuvres > 1 ? 's' : ''} au catalogue
        </p>
        {personne.bio && (
          <p style={{ fontSize: 'var(--text-body)', maxWidth: 640 }}>{personne.bio}</p>
        )}
      </header>

      {Object.entries(personne.filmographie).map(([role, oeuvres]) => (
        <section key={role}>
          <EnTeteSection titre={role} />
          <GrilleOeuvres oeuvres={oeuvres} />
        </section>
      ))}
    </div>
  )
}
