import { EtatVide } from '@/components/Etats'

/**
 * Page introuvable.
 *
 * Jamais une 404 brute : le commanditaire qui clique à côté du scénario doit
 * lire une phrase compréhensible et repartir quelque part.
 */
export default function PageIntrouvable() {
  return (
    <EtatVide
      titre="Cette page n'existe pas"
      message="Le lien est peut-être erroné, ou l'écran ne fait pas partie de cette démonstration."
      action={{ libelle: "Revenir à l'accueil", href: '/' }}
    />
  )
}
