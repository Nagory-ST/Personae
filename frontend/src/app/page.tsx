/**
 * Accueil — écran 1 du scénario de démonstration.
 *
 * Sélections éditoriales, puis fil **chronologique** des avis des comptes
 * suivis. Aucun algorithme d'engagement : c'est un parti pris explicite,
 * présenté comme tel au commanditaire.
 */

'use client'

import { useEffect, useState } from 'react'
import { EnTeteSection } from '@/components/AppShell'
import { EtatChargement, EtatErreur } from '@/components/Etats'
import { RangeeOeuvres, WorkCard } from '@/components/WorkCard'
import { api, formaterNote } from '@/lib/api'
import type { Accueil } from '@/lib/types'
import Link from 'next/link'

export default function PageAccueil() {
  const [donnees, setDonnees] = useState<Accueil | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<Accueil>('/accueil')
      .then(setDonnees)
      .catch((e) => setErreur(e.message))
  }, [])

  if (erreur) return <EtatErreur message={erreur} />
  if (!donnees) return <EtatChargement lignes={4} />

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-12)' }}>
      <header>
        <h1
          className="font-display"
          style={{
            fontSize: 'var(--text-display)',
            fontWeight: 700,
            letterSpacing: 'var(--tracking-title)',
          }}
        >
          Votre bibliothèque
        </h1>
        <p
          style={{
            fontSize: 'var(--text-body)',
            color: 'var(--color-text-secondary)',
            marginTop: 'var(--space-2)',
          }}
        >
          Films, séries et livres au même endroit — et les liens entre eux.
        </p>
      </header>

      {donnees.selections.map((theme) => (
        <section key={theme.slug}>
          <EnTeteSection titre={theme.label} description={theme.description} />
          <RangeeOeuvres oeuvres={theme.oeuvres} />
        </section>
      ))}

      <section>
        <EnTeteSection
          titre={donnees.activite.length > 0 ? 'Les avis des comptes que vous suivez' : 'À découvrir'}
          description={
            donnees.activite.length > 0
              ? 'Par ordre chronologique, sans tri algorithmique.'
              : 'Les œuvres les mieux notées du catalogue.'
          }
        />

        {donnees.activite.length > 0 ? (
          <ul className="flex flex-col" style={{ gap: 'var(--space-4)' }}>
            {donnees.activite.map((entree, index) => (
              <li
                key={`${entree.auteur_id}-${entree.work.id}-${index}`}
                className="flex rounded-lg border border-border bg-glass"
                style={{ gap: 'var(--space-5)', padding: 'var(--card-padding)' }}
              >
                <WorkCard oeuvre={entree.work} variante="compact" />
                <div className="flex flex-col" style={{ gap: 'var(--space-2)', flex: 1 }}>
                  <span style={{ fontSize: 'var(--text-ui)' }}>
                    <Link
                      href={`/profil/?id=${entree.auteur_id}`}
                      style={{ color: 'var(--color-text-accent)', fontWeight: 600 }}
                    >
                      {entree.auteur_pseudo}
                    </Link>{' '}
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      a noté {formaterNote(entree.rating)}
                    </span>
                  </span>
                  {entree.body && (
                    <p style={{ fontSize: 'var(--text-body)' }}>{entree.body}</p>
                  )}
                  <span
                    style={{
                      fontSize: 'var(--text-meta)',
                      color: 'var(--color-text-secondary)',
                      marginTop: 'auto',
                    }}
                  >
                    {entree.created_at.split('-').reverse().join('/')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <RangeeOeuvres oeuvres={donnees.decouverte} />
        )}
      </section>
    </div>
  )
}
