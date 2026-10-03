/**
 * Connexion.
 *
 * Le bloc d'aide (liste des comptes fictifs) n'apparaît que si le backend le
 * dit, via `api_config` — et non une variable embarquée au build. Sur la démo
 * publique il est masqué. Le mot de passe, lui, n'est JAMAIS dans le code :
 * il est généré à l'installation et transmis hors du site.
 */

'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api, ErreurApi } from '@/lib/api'
import type { Utilisateur } from '@/lib/types'

type ConfigPublique = {
  mode: string
  inscription_ouverte: boolean
  aide_connexion_affichee: boolean
}

const COMPTES_DEMO = [
  { email: 'alexandre@example.org', role: 'compte de démonstration' },
  { email: 'margaux@example.org', role: 'cinéma d’auteur' },
  { email: 'theo@example.org', role: 'science-fiction' },
  { email: 'nadia@example.org', role: 'séries et romans' },
]
// Aucun mot de passe dans le code : sur la démo publique, il est généré à
// l'installation (supabase/jeu/installer-communaute.sql) et transmis hors du site.

export default function PageConnexion() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  // Par défaut MASQUÉE : si `/api/config` ne répond pas, on n'affiche pas un
  // mot de passe par erreur. L'aide n'apparaît que sur confirmation explicite.
  const [aideAffichee, setAideAffichee] = useState(false)

  useEffect(() => {
    api
      .get<ConfigPublique>('/config')
      .then((config) => setAideAffichee(config.aide_connexion_affichee))
      .catch(() => setAideAffichee(false))
  }, [])

  async function soumettre(evenement: React.FormEvent) {
    evenement.preventDefault()
    setErreur(null)
    setEnCours(true)
    try {
      await api.post<Utilisateur>('/auth/connexion', {
        email,
        mot_de_passe: motDePasse,
      })
      router.push('/')
      router.refresh()
    } catch (e) {
      setErreur((e as ErreurApi).message)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div style={{ maxWidth: 460 }}>
      <h1
        className="font-display"
        style={{ fontSize: 'var(--text-display)', fontWeight: 700, marginBottom: 'var(--space-6)' }}
      >
        Se connecter
      </h1>

      <form
        onSubmit={soumettre}
        className="flex flex-col rounded-lg border border-border bg-glass"
        style={{ gap: 'var(--space-4)', padding: 'var(--card-padding)' }}
      >
        <label className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-ui)' }}>Adresse électronique</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            className="rounded-md border border-border bg-transparent"
            style={{
              padding: 'var(--space-3)',
              fontSize: 'var(--text-body)',
              color: 'var(--color-text)',
            }}
          />
        </label>

        <label className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-ui)' }}>Mot de passe</span>
          <input
            type="password"
            required
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            autoComplete="current-password"
            className="rounded-md border border-border bg-transparent"
            style={{
              padding: 'var(--space-3)',
              fontSize: 'var(--text-body)',
              color: 'var(--color-text)',
            }}
          />
        </label>

        {erreur && (
          <p
            role="alert"
            style={{ fontSize: 'var(--text-meta)', color: 'var(--color-danger)' }}
          >
            {erreur}
          </p>
        )}

        <button
          type="submit"
          disabled={enCours}
          className="rounded-md font-semibold"
          style={{
            padding: 'var(--btn-padding)',
            fontSize: 'var(--text-ui)',
            background: 'var(--btn-bg-primary)',
            color: 'var(--btn-fg-primary)',
            opacity: enCours ? 0.45 : 1,
            cursor: enCours ? 'not-allowed' : 'pointer',
          }}
        >
          {enCours ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      {aideAffichee && (
      <section
        className="rounded-lg border border-border"
        style={{ marginTop: 'var(--space-6)', padding: 'var(--card-padding)' }}
      >
        <h2
          className="uppercase"
          style={{
            fontSize: 'var(--text-micro)',
            letterSpacing: 'var(--tracking-micro)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Comptes de démonstration
        </h2>
        <ul className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
          {COMPTES_DEMO.map((compte) => (
            <li key={compte.email}>
              <button
                type="button"
                onClick={() => setEmail(compte.email)}
                className="flex w-full items-baseline rounded-md transition-colors hover:bg-glass"
                style={{
                  gap: 'var(--space-3)',
                  padding: 'var(--space-2)',
                  fontSize: 'var(--text-meta)',
                  textAlign: 'left',
                }}
              >
                <span style={{ color: 'var(--color-text-accent)' }}>{compte.email}</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>{compte.role}</span>
              </button>
            </li>
          ))}
        </ul>
        <p
          style={{
            fontSize: 'var(--text-micro)',
            color: 'var(--color-text-secondary)',
            marginTop: 'var(--space-3)',
          }}
        >
          Mot de passe : transmis avec le lien de la démonstration — comptes
          fictifs, aucune donnée personnelle réelle.
        </p>
      </section>
      )}
    </div>
  )
}
