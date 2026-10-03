/**
 * Carte d'œuvre — **le composant qui remplace neuf variantes** (DA §6.1).
 *
 * Les maquettes déclaraient `CollectionCard`, `DebatCard`, `FilmoCard`,
 * `NouveauteCard`, `PinnedCard`, `PrivateCard`, `RecoCard`, `ThemeCard` et
 * `TrendCard` : neuf implémentations du même objet. Neuf endroits où corriger
 * une couleur, et neuf occasions de diverger — c'est exactement ce qui a
 * produit des compteurs contradictoires d'un écran à l'autre.
 *
 * **La note affichée ici vient toujours de l'API**, jamais d'un calcul local
 * ni d'une valeur écrite en dur (CA-D3).
 */

import Link from 'next/link'
import { formaterNote } from '@/lib/api'
import type { WorkBref } from '@/lib/types'
import { IconeType } from './Icon'
import { Jaquette } from './Jaquette'

type Variante = 'default' | 'compact'

export function WorkCard({
  oeuvre,
  variante = 'default',
  complement,
}: {
  oeuvre: WorkBref
  variante?: Variante
  /** Emplacement libre : statut de collection, rôle tenu, date de lecture… */
  complement?: React.ReactNode
}) {
  const compacte = variante === 'compact'
  const largeur = compacte ? 104 : 150
  const hauteur = compacte ? 152 : 220

  return (
    <Link
      href={`/oeuvres/?slug=${encodeURIComponent(oeuvre.slug)}`}
      className="group flex flex-col rounded-lg transition-colors"
      style={{ gap: 'var(--space-2)', width: largeur }}
    >
      <span className="transition-opacity group-hover:opacity-90">
        <Jaquette
          titre={oeuvre.title}
          type={oeuvre.type}
          largeur={largeur}
          hauteur={hauteur}
        />
      </span>

      <span
        className="font-display transition-colors group-hover:text-[var(--color-accent-hover)]"
        style={{
          fontSize: compacte ? 'var(--text-ui)' : 'var(--text-heading)',
          lineHeight: 'var(--leading-title)',
          color: 'var(--color-text)',
        }}
      >
        {oeuvre.title}
      </span>

      <span
        className="flex items-center"
        style={{
          gap: 'var(--space-2)',
          fontSize: 'var(--text-meta)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <IconeType type={oeuvre.type} />
        {oeuvre.release_year ?? '—'}
        {/* Une note absente s'écrit « — » : ne jamais afficher 0, qui se lirait
            comme une très mauvaise note plutôt que comme une absence. */}
        {oeuvre.rating_count > 0 && (
          <span style={{ color: 'var(--color-text-accent)' }}>
            {formaterNote(oeuvre.rating_average)}
          </span>
        )}
      </span>

      {complement}
    </Link>
  )
}

/** Grille de cartes, avec l'espacement de la DA. */
export function GrilleOeuvres({
  oeuvres,
  variante,
}: {
  oeuvres: WorkBref[]
  variante?: Variante
}) {
  return (
    <div className="flex flex-wrap" style={{ gap: 'var(--space-6)' }}>
      {oeuvres.map((oeuvre) => (
        <WorkCard key={oeuvre.id} oeuvre={oeuvre} variante={variante} />
      ))}
    </div>
  )
}

/** Rangée horizontale défilante — utilisée par les sélections de l'accueil. */
export function RangeeOeuvres({ oeuvres }: { oeuvres: WorkBref[] }) {
  return (
    <div
      className="flex overflow-x-auto"
      style={{ gap: 'var(--space-5)', paddingBottom: 'var(--space-2)' }}
    >
      {oeuvres.map((oeuvre) => (
        <div key={oeuvre.id} style={{ flex: '0 0 auto' }}>
          <WorkCard oeuvre={oeuvre} />
        </div>
      ))}
    </div>
  )
}
