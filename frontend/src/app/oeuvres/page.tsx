/**
 * Fiche Œuvre — servie en page statique (GitHub Pages).
 *
 * L'identifiant passe en paramètre de requête plutôt qu'en segment de chemin :
 * un export statique ne peut pas générer une page par identifiant inconnu au
 * build. `useSearchParams` exige une frontière Suspense en export statique.
 */

'use client'

import { Suspense } from 'react'
import { EtatChargement } from '@/components/Etats'
import { FicheOeuvre } from './Fiche'

export default function Page() {
  return (
    <Suspense fallback={<EtatChargement lignes={3} />}>
      <FicheOeuvre />
    </Suspense>
  )
}
