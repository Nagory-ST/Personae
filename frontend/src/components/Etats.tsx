/**
 * Les quatre états que les maquettes ne montraient jamais (DA §6.3).
 *
 * Les dix maquettes n'affichaient que le cas nominal, toujours rempli. Or la
 * démonstration se déroule devant quelqu'un qui cliquera à côté du scénario.
 * Un cadre vide sous un compteur qui annonce « 58 séries », ou une 404 brute,
 * ruinent la crédibilité plus sûrement qu'un écran imparfait.
 */

import Link from 'next/link'
import { Icon, type NomIcone } from './Icon'

function Cadre({
  icone,
  titre,
  children,
}: {
  icone: NomIcone
  titre: string
  children?: React.ReactNode
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg border border-border bg-glass text-center"
      style={{ padding: 'var(--space-12) var(--space-8)', gap: 'var(--space-3)' }}
    >
      <span style={{ color: 'var(--color-decor-muted)' }}>
        <Icon nom={icone} taille={32} />
      </span>
      <p className="font-display" style={{ fontSize: 'var(--text-heading)' }}>
        {titre}
      </p>
      {children}
    </div>
  )
}

export function EtatVide({
  titre,
  message,
  action,
}: {
  titre: string
  message: string
  action?: { libelle: string; href: string }
}) {
  return (
    <Cadre icone="collection" titre={titre}>
      <p style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-secondary)' }}>
        {message}
      </p>
      {action && (
        <Link
          href={action.href}
          className="rounded-md border border-border transition-colors hover:bg-glass"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            fontSize: 'var(--text-ui)',
            color: 'var(--color-text-accent)',
            marginTop: 'var(--space-2)',
          }}
        >
          {action.libelle}
        </Link>
      )}
    </Cadre>
  )
}

export function EtatErreur({ message }: { message: string }) {
  return (
    <Cadre icone="quiz" titre="Quelque chose n'a pas fonctionné">
      {/* Le message vient de l'API et est rédigé pour être lu : aucune trace
          technique n'atteint l'écran. */}
      <p style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-secondary)' }}>
        {message}
      </p>
    </Cadre>
  )
}

/**
 * Écran prévu mais hors du périmètre de cette démonstration.
 *
 * Propre à ce projet, et important : si le commanditaire clique sur « Débats »,
 * il doit lire un **choix assumé**, jamais une 404 qui ressemble à un bug.
 */
export function EtatHorsPerimetre({
  titre,
  quand,
}: {
  titre: string
  quand: string
}) {
  return (
    <Cadre icone="debate" titre={titre}>
      <p style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-secondary)', maxWidth: 460 }}>
        Prévu — hors périmètre de cette démonstration. {quand}
      </p>
      <span
        className="rounded-sm border border-border uppercase"
        style={{
          padding: 'var(--space-1) var(--space-2)',
          fontSize: 'var(--text-micro)',
          letterSpacing: 'var(--tracking-micro)',
          color: 'var(--color-text-accent)',
          marginTop: 'var(--space-2)',
        }}
      >
        Backlog assumé
      </span>
    </Cadre>
  )
}

/** Squelette aux dimensions du contenu attendu, jamais un spinner centré. */
export function EtatChargement({ lignes = 3 }: { lignes?: number }) {
  return (
    <div
      className="flex flex-col"
      style={{ gap: 'var(--space-3)' }}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Chargement en cours</span>
      {Array.from({ length: lignes }).map((_, index) => (
        <div
          key={index}
          className="rounded-md bg-glass"
          style={{ height: 72, opacity: 1 - index * 0.15 }}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}
