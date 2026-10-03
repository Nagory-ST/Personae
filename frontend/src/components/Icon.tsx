/**
 * Jeu d'icônes maison — repris tel quel des maquettes, qui étaient déjà
 * cohérentes sur ce point (DA §8).
 *
 * Traits, jamais pleins. `currentColor`, grille 24×24, `stroke-width` 1.5.
 * **Aucune bibliothèque tierce** : cohérence garantie et zéro dépendance
 * réseau, ce qui compte pour une démonstration hors ligne.
 *
 * Accessibilité : une icône décorative est `aria-hidden`. Une icône SEULE qui
 * porte une action doit recevoir un `libelle` — sans quoi elle est muette pour
 * un lecteur d'écran.
 */

export const chemins = {
  home: 'm3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  explore: 'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15z M21 21l-4.35-4.35',
  collection:
    'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  profile: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  debate:
    'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  quiz: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3 M12 17h.01',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z',
  film: 'M2 3h20v18H2z M7 3v18 M17 3v18 M2 9h5 M2 15h5 M17 9h5 M17 15h5',
  tv: 'M2 7h20v13H2z M17 2l-5 5-5-5',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  back: 'M19 12H5 M12 19l-7-7 7-7',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  check: 'M20 6L9 17l-5-5',
  plus: 'M12 5v14 M5 12h14',
  heart:
    'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
} as const

export type NomIcone = keyof typeof chemins

export function Icon({
  nom,
  taille = 18,
  libelle,
}: {
  nom: NomIcone
  taille?: number
  /** Renseigner UNIQUEMENT si l'icône est seule et porte du sens. */
  libelle?: string
}) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={libelle ? 'img' : undefined}
      aria-label={libelle}
      aria-hidden={libelle ? undefined : true}
      focusable="false"
    >
      {chemins[nom].split(' M').map((segment, index) => (
        <path key={index} d={index === 0 ? segment : `M${segment}`} />
      ))}
    </svg>
  )
}

/** Icône correspondant à un type d'œuvre. */
export function IconeType({ type, taille = 14 }: { type: string; taille?: number }) {
  const nom: NomIcone = type === 'book' ? 'book' : type === 'serie' ? 'tv' : 'film'
  return <Icon nom={nom} taille={taille} />
}
