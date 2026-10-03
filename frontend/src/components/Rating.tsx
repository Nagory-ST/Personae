/**
 * Notation — /10 au pas de 0,1 (Q-06, tranchée d'après les maquettes).
 *
 * Fusionne `ScoreStars`, `StarRating`, `Stars` et `Star` des maquettes en un
 * seul composant (DA §6.2). L'échelle décimale est conservée telle quelle :
 * passer à des étoiles resterait possible depuis /10, l'inverse non.
 */

'use client'

import { useState } from 'react'
import { formaterNote } from '@/lib/api'

export function Note({
  valeur,
  nombre,
  taille = 'normale',
}: {
  valeur: string | null
  nombre: number
  taille?: 'normale' | 'grande'
}) {
  const grande = taille === 'grande'
  return (
    <span className="flex items-baseline" style={{ gap: 'var(--space-2)' }}>
      <span
        className="font-display font-bold"
        style={{
          fontSize: grande ? 'var(--text-display)' : 'var(--text-title)',
          color: 'var(--color-accent)',
          lineHeight: 1,
        }}
      >
        {formaterNote(valeur)}
      </span>
      <span style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-secondary)' }}>
        {nombre === 0
          ? 'aucun avis'
          : `sur ${nombre} avis`}
      </span>
    </span>
  )
}

/**
 * Histogramme des notes.
 *
 * Les onze tranches sont toujours dessinées, y compris à zéro : un histogramme
 * dont les barres vides disparaissent laisse croire que la donnée manque.
 */
export function Distribution({
  donnees,
}: {
  donnees: { tranche: number; nombre: number }[]
}) {
  const maximum = Math.max(...donnees.map((d) => d.nombre), 1)
  return (
    <div className="flex items-end" style={{ gap: 3, height: 56 }}>
      {donnees.map((d) => (
        <div
          key={d.tranche}
          className="flex flex-col items-center justify-end"
          style={{ flex: 1, height: '100%' }}
          title={`${d.nombre} avis entre ${d.tranche} et ${d.tranche + 1}`}
        >
          <div
            style={{
              width: '100%',
              height: `${Math.max((d.nombre / maximum) * 100, 2)}%`,
              background:
                d.nombre > 0 ? 'var(--color-accent)' : 'var(--color-decor-muted)',
              opacity: d.nombre > 0 ? 0.75 : 0.3,
              borderRadius: '2px 2px 0 0',
            }}
          />
          <span
            style={{
              fontSize: 'var(--text-micro)',
              color: 'var(--color-text-secondary)',
              marginTop: 2,
            }}
          >
            {d.tranche}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * Saisie d'une note — l'écriture en direct de l'étape 6 du scénario.
 *
 * Le pas est de 0,1 : c'est l'échelle des maquettes, et l'API refuse toute
 * valeur plus précise. Le curseur l'impose plutôt que de laisser l'utilisateur
 * saisir 8,47 pour se le voir refuser ensuite.
 */
export function SaisieNote({
  valeurInitiale,
  avisInitial,
  onEnregistrer,
  onRetirer,
  enCours,
}: {
  valeurInitiale: string | null
  avisInitial: string | null
  onEnregistrer: (note: number, avis: string) => void
  /** Retire la note existante. N'est proposé que s'il y en a une. */
  onRetirer?: () => void
  enCours: boolean
}) {
  const [note, setNote] = useState<number>(
    valeurInitiale ? Number(valeurInitiale) : 7.5,
  )
  const [avis, setAvis] = useState<string>(avisInitial ?? '')

  return (
    <form
      className="flex flex-col rounded-lg border border-border bg-glass"
      style={{ gap: 'var(--space-4)', padding: 'var(--card-padding)' }}
      onSubmit={(evenement) => {
        evenement.preventDefault()
        onEnregistrer(note, avis)
      }}
    >
      <label
        className="flex items-center"
        style={{ gap: 'var(--space-4)', fontSize: 'var(--text-ui)' }}
      >
        <span>Ma note</span>
        <input
          type="range"
          min={0}
          max={10}
          step={0.1}
          value={note}
          onChange={(evenement) => setNote(Number(evenement.target.value))}
          style={{ flex: 1, accentColor: 'var(--color-accent)' }}
          aria-label="Note sur 10"
        />
        <output
          className="font-display font-bold"
          style={{
            fontSize: 'var(--text-title)',
            color: 'var(--color-accent)',
            minWidth: 52,
            textAlign: 'right',
          }}
        >
          {note.toFixed(1).replace('.', ',')}
        </output>
      </label>

      <textarea
        value={avis}
        onChange={(evenement) => setAvis(evenement.target.value)}
        placeholder="Ce que vous en avez pensé (facultatif)"
        rows={3}
        maxLength={5000}
        className="rounded-md border border-border bg-transparent"
        style={{
          padding: 'var(--space-3)',
          fontSize: 'var(--text-body)',
          color: 'var(--color-text)',
          resize: 'vertical',
        }}
        aria-label="Votre avis"
      />

      <div className="flex items-center" style={{ gap: 'var(--space-4)' }}>
        <button
          type="submit"
          disabled={enCours}
          className="rounded-md font-semibold transition-colors"
          style={{
            padding: 'var(--btn-padding)',
            fontSize: 'var(--text-ui)',
            background: 'var(--btn-bg-primary)',
            color: 'var(--btn-fg-primary)',
            opacity: enCours ? 0.45 : 1,
            cursor: enCours ? 'not-allowed' : 'pointer',
          }}
        >
          {enCours ? 'Enregistrement…' : valeurInitiale ? 'Modifier ma note' : 'Enregistrer'}
        </button>

        {/* Le retrait n'existe que s'il y a quelque chose à retirer. Bouton
            secondaire, volontairement discret : c'est une correction d'erreur,
            pas une action courante — mais elle doit exister. Sans elle, une
            note posée par mégarde restait dans la moyenne pour toujours. */}
        {valeurInitiale && onRetirer && (
          <button
            type="button"
            onClick={onRetirer}
            disabled={enCours}
            className="transition-colors hover:text-[var(--color-danger)]"
            style={{
              fontSize: 'var(--text-meta)',
              color: 'var(--color-text-secondary)',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
              cursor: enCours ? 'not-allowed' : 'pointer',
            }}
          >
            Retirer ma note
          </button>
        )}
      </div>
    </form>
  )
}
