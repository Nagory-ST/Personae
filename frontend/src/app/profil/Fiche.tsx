/**
 * Profil — écran 8 du scénario.
 *
 * **L'écran où l'incohérence se voyait le plus dans les maquettes.** Tous les
 * chiffres viennent de l'API, qui les recalcule ; aucun n'est stocké, aucun
 * n'est écrit en dur. La répartition par domaine totalise le compteur de
 * collection — c'est vérifié par un test d'intégration.
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { EnTeteSection } from '@/components/AppShell'
import { EtatChargement, EtatErreur, EtatVide } from '@/components/Etats'
import { GrilleOeuvres } from '@/components/WorkCard'
import { api, formaterNote, type ErreurApi } from '@/lib/api'
import type { Profil } from '@/lib/types'

export function FicheProfil() {
  const id = useSearchParams().get('id') ?? ''
  const [profil, setProfil] = useState<Profil | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<Profil>(`/users/${id}/profil`)
      .then(setProfil)
      .catch((e: ErreurApi) => setErreur(e.message))
  }, [id])

  if (erreur) return <EtatErreur message={erreur} />
  if (!profil) return <EtatChargement lignes={3} />

  const total = Object.values(profil.repartition).reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-12)' }}>
      <header className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
        <h1
          className="font-display"
          style={{ fontSize: 'var(--text-display)', fontWeight: 700 }}
        >
          {profil.display_name ?? profil.pseudo}
        </h1>
        {profil.bio && (
          <p style={{ fontSize: 'var(--text-body)', maxWidth: 620 }}>{profil.bio}</p>
        )}
        <p style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-secondary)' }}>
          {profil.nb_abonnements} abonnement{profil.nb_abonnements > 1 ? 's' : ''} ·{' '}
          {profil.nb_abonnes} abonné{profil.nb_abonnes > 1 ? 's' : ''}
        </p>
      </header>

      <section className="flex flex-wrap" style={{ gap: 'var(--space-4)' }}>
        <Statistique valeur={String(profil.nb_avis)} libelle="avis écrits" />
        <Statistique valeur={formaterNote(profil.note_moyenne)} libelle="note moyenne" accent />
        <Statistique valeur={String(profil.nb_collection)} libelle="en collection" />
        <Statistique valeur={String(profil.nb_vus)} libelle="vus / lus" />
      </section>

      {total > 0 && (
        <section>
          <EnTeteSection
            titre="Répartition"
            description="La somme des domaines égale le total de la collection."
          />
          <div className="flex flex-col" style={{ gap: 'var(--space-2)', maxWidth: 520 }}>
            {Object.entries(profil.repartition).map(([domaine, nombre]) => (
              <div key={domaine} className="flex items-center" style={{ gap: 'var(--space-3)' }}>
                <span style={{ fontSize: 'var(--text-ui)', minWidth: 72 }}>{domaine}</span>
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    background: 'var(--color-surface-glass)',
                    borderRadius: 4,
                  }}
                >
                  <div
                    style={{
                      width: `${(nombre / total) * 100}%`,
                      height: '100%',
                      background: 'var(--color-accent)',
                      borderRadius: 4,
                      opacity: 0.8,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 'var(--text-meta)',
                    color: 'var(--color-text-secondary)',
                    minWidth: 28,
                    textAlign: 'right',
                  }}
                >
                  {nombre}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <EnTeteSection titre="Coups de cœur" />
        {profil.coups_de_coeur.length === 0 ? (
          <EtatVide
            titre="Aucun coup de cœur"
            message="Les œuvres marquées comme coup de cœur apparaîtront ici."
          />
        ) : (
          <GrilleOeuvres oeuvres={profil.coups_de_coeur} />
        )}
      </section>
    </div>
  )
}

function Statistique({
  valeur,
  libelle,
  accent,
}: {
  valeur: string
  libelle: string
  accent?: boolean
}) {
  return (
    <div
      className="flex flex-col rounded-lg border border-border bg-glass"
      style={{ padding: 'var(--card-padding)', minWidth: 148, gap: 'var(--space-1)' }}
    >
      <span
        className="font-display font-bold"
        style={{
          fontSize: 'var(--text-title)',
          color: accent ? 'var(--color-accent)' : 'var(--color-text)',
        }}
      >
        {valeur}
      </span>
      <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-secondary)' }}>
        {libelle}
      </span>
    </div>
  )
}
