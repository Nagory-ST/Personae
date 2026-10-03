/**
 * Identité visuelle — **point de substitution unique** (contrainte D-10).
 *
 * L'identité définitive se décide AVEC le commanditaire : deux pistes existent
 * au dossier (monogramme « P » cuivre, masque de théâtre doré). En attendant,
 * c'est le monogramme qu'implémentent les maquettes qui sert de référence.
 *
 * **Règle dure** : aucun écran ne redessine la marque ni n'importe une image de
 * logo. Tout passe par ce composant. Changer d'identité doit coûter ce fichier,
 * pas une reprise des neuf écrans.
 */
export function Logo({ taille = 32 }: { taille?: number }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="Personae"
    >
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="9"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
        fill="var(--color-surface)"
      />
      <path
        d="M14 28V12h7.2a4.8 4.8 0 0 1 0 9.6H14"
        stroke="var(--color-accent)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

export function LogoAvecNom() {
  return (
    <span className="flex items-center gap-3">
      <Logo taille={30} />
      <span
        className="font-display font-semibold"
        style={{ fontSize: 'var(--text-heading)', letterSpacing: '0.02em' }}
      >
        Personae
      </span>
    </span>
  )
}
