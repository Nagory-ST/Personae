/**
 * Jaquette dessinée — **aucune image tierce** (ADR D-19, révisée le 30/08).
 *
 * Les maquettes ne contenaient pas un seul `<img>` : les visuels y étaient déjà
 * des SVG. On conserve ce choix, qui règle trois problèmes d'un coup :
 * zéro question de droit d'image, zéro requête sortante, et une CSP
 * `img-src 'self' data:` obtenue sans concession.
 *
 * Le dessin est **déterministe** : la même œuvre produit toujours la même
 * jaquette. Un visuel qui changerait d'un rechargement à l'autre serait
 * immédiatement repéré pendant une démonstration.
 */

/** Hachage stable d'une chaîne — même entrée, même sortie, toujours. */
function empreinte(valeur: string): number {
  let h = 0
  for (let i = 0; i < valeur.length; i += 1) {
    h = (h << 5) - h + valeur.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

/** Teintes tirées de la palette de la DA — jamais une couleur au hasard. */
const TEINTES = [
  ['#1C2541', '#3D1C52'],
  ['#0B132B', '#1A0A2E'],
  ['#162544', '#0A1628'],
  ['#1A0A05', '#3D1C52'],
  ['#0A0A1A', '#1C2541'],
] as const

export function Jaquette({
  titre,
  type,
  largeur = 150,
  hauteur = 220,
}: {
  titre: string
  type: string
  largeur?: number
  hauteur?: number
}) {
  const graine = empreinte(`${titre}:${type}`)
  const [debut, fin] = TEINTES[graine % TEINTES.length]
  const identifiant = `jaquette-${graine}`
  const initiales = titre
    .split(/\s+/)
    .filter((mot) => mot.length > 2)
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase() ?? '')
    .join('')
  const angle = 20 + (graine % 60)

  return (
    <svg
      width={largeur}
      height={hauteur}
      viewBox="0 0 150 220"
      role="img"
      aria-label={`Jaquette de ${titre}`}
      style={{ borderRadius: 'var(--radius-md)', display: 'block' }}
    >
      <defs>
        <linearGradient id={identifiant} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={debut} />
          <stop offset="100%" stopColor={fin} />
        </linearGradient>
      </defs>
      <rect width="150" height="220" rx="8" fill={`url(#${identifiant})`} />
      {/* Trait diagonal : la variation vient de l'empreinte du titre, ce qui
          distingue les jaquettes sans jamais introduire d'aléatoire. */}
      <path
        d={`M0 ${angle + 60} L150 ${angle}`}
        stroke="var(--color-accent)"
        strokeWidth="1"
        opacity="0.25"
      />
      <path
        d={`M0 ${angle + 110} L150 ${angle + 50}`}
        stroke="var(--color-accent)"
        strokeWidth="1"
        opacity="0.15"
      />
      <text
        x="75"
        y="118"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize="44"
        fontWeight="600"
        fill="var(--color-accent)"
        opacity="0.85"
      >
        {initiales}
      </text>
      <rect
        x="0.5"
        y="0.5"
        width="149"
        height="219"
        rx="8"
        fill="none"
        stroke="var(--color-border)"
      />
    </svg>
  )
}
