/**
 * Ma collection — écran 7 du scénario.
 *
 * L'entrée créée à l'étape 6 doit y apparaître immédiatement. Filtres par
 * domaine et par statut, plus les coups de cœur.
 *
 * Le compteur affiché porte sur **ce qui est visible**, pas sur un total
 * global : afficher « 58 » au-dessus de trois cartes est le défaut relevé dans
 * les maquettes.
 */

'use client'

import { useEffect, useState } from 'react'
import { EtatChargement, EtatErreur, EtatVide } from '@/components/Etats'
import { WorkCard } from '@/components/WorkCard'
import { api, ErreurApi } from '@/lib/api'
import type { EntreeCollection } from '@/lib/types'
import Link from 'next/link'

const STATUTS = [
  { code: '', libelle: 'Tout' },
  { code: 'to_consume', libelle: 'À voir / à lire' },
  { code: 'consumed', libelle: 'Vu / lu' },
  { code: 'dropped', libelle: 'Abandonné' },
] as const

const DOMAINES = [
  { code: '', libelle: 'Tout' },
  { code: 'film', libelle: 'Films' },
  { code: 'serie', libelle: 'Séries' },
  { code: 'book', libelle: 'Livres' },
] as const

export default function PageCollection() {
  const [statut, setStatut] = useState('')
  const [domaine, setDomaine] = useState('')
  const [coupsDeCoeur, setCoupsDeCoeur] = useState(false)
  const [donnees, setDonnees] = useState<{ items: EntreeCollection[]; total: number } | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [nonConnecte, setNonConnecte] = useState(false)

  useEffect(() => {
    const parametres = new URLSearchParams()
    if (statut) parametres.set('statut', statut)
    if (domaine) parametres.set('type', domaine)
    if (coupsDeCoeur) parametres.set('coup_de_coeur', 'true')

    setDonnees(null)
    api
      .get<{ items: EntreeCollection[]; total: number }>(`/collection?${parametres}`)
      .then(setDonnees)
      .catch((e: ErreurApi) => {
        if (e.estNonAutorise) setNonConnecte(true)
        else setErreur(e.message)
      })
  }, [statut, domaine, coupsDeCoeur])

  if (nonConnecte) {
    return (
      <EtatVide
        titre="Votre collection vous attend"
        message="Connectez-vous pour retrouver ce que vous avez vu, lu et aimé."
        action={{ libelle: 'Se connecter', href: '/connexion' }}
      />
    )
  }
  if (erreur) return <EtatErreur message={erreur} />

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-6)' }}>
      <h1 className="font-display" style={{ fontSize: 'var(--text-display)', fontWeight: 700 }}>
        Ma collection
      </h1>

      <div className="flex flex-wrap items-center" style={{ gap: 'var(--space-2)' }}>
        {DOMAINES.map((d) => (
          <Bouton key={d.code} actif={domaine === d.code} onClick={() => setDomaine(d.code)}>
            {d.libelle}
          </Bouton>
        ))}
        <span style={{ width: 'var(--space-4)' }} />
        {STATUTS.map((s) => (
          <Bouton key={s.code} actif={statut === s.code} onClick={() => setStatut(s.code)}>
            {s.libelle}
          </Bouton>
        ))}
        <span style={{ width: 'var(--space-4)' }} />
        <Bouton actif={coupsDeCoeur} onClick={() => setCoupsDeCoeur((v) => !v)}>
          Coups de cœur
        </Bouton>
      </div>

      {donnees && (
        <p style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-secondary)' }}>
          {donnees.total} entrée{donnees.total > 1 ? 's' : ''}
        </p>
      )}

      {!donnees ? (
        <EtatChargement lignes={2} />
      ) : donnees.items.length === 0 ? (
        <EtatVide
          titre="Rien ici pour l'instant"
          message={
            statut || domaine || coupsDeCoeur
              ? 'Aucune entrée ne correspond à ces filtres.'
              : "Votre collection est vide. Explorez le catalogue pour y ajouter une première œuvre."
          }
          action={{ libelle: 'Explorer', href: '/explorer' }}
        />
      ) : (
        <div className="flex flex-wrap" style={{ gap: 'var(--space-6)' }}>
          {donnees.items.map((entree) => (
            <WorkCard
              key={entree.id}
              oeuvre={entree.work}
              complement={
                <span
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: entree.is_highlight
                      ? 'var(--color-accent)'
                      : 'var(--color-text-secondary)',
                  }}
                >
                  {libelleStatut(entree.statut)}
                  {entree.is_highlight && ' · coup de cœur'}
                </span>
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

function libelleStatut(code: string): string {
  if (code === 'consumed') return 'Vu / lu'
  if (code === 'dropped') return 'Abandonné'
  return 'À voir / à lire'
}

function Bouton({
  actif,
  onClick,
  children,
}: {
  actif: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className="rounded-sm border transition-colors"
      style={{
        padding: 'var(--tag-padding)',
        fontSize: 'var(--text-meta)',
        borderColor: actif ? 'var(--color-accent)' : 'var(--color-border)',
        color: actif ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        background: actif ? 'var(--color-surface-glass)' : 'transparent',
      }}
    >
      {children}
    </button>
  )
}
