/**
 * Chrome applicatif : barre latérale, en-tête, zone de contenu.
 *
 * **C'est ici que se joue le trou principal des maquettes** : chacune était une
 * île, sans aucun lien vers les autres (analyse §2.2). Neuf écrans qui ne
 * communiquaient pas. Toute la navigation du produit est construite ici, et
 * **chaque lien mène quelque part** — y compris les écrans hors périmètre, qui
 * affichent un état assumé plutôt qu'une 404.
 */

'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Utilisateur } from '@/lib/types'
import { Icon, type NomIcone } from './Icon'
import { LogoAvecNom } from './Logo'

type Entree = {
  href: string
  libelle: string
  icone: NomIcone
  /** Écran présent dans la navigation mais hors périmètre de la démonstration. */
  horsPerimetre?: boolean
}

const NAVIGATION: Entree[] = [
  { href: '/', libelle: 'Accueil', icone: 'home' },
  { href: '/explorer', libelle: 'Explorer', icone: 'explore' },
  { href: '/collection', libelle: 'Ma collection', icone: 'collection' },
  { href: '/debats', libelle: 'Débats', icone: 'debate', horsPerimetre: true },
  { href: '/quiz', libelle: 'Quiz', icone: 'quiz', horsPerimetre: true },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const chemin = usePathname()
  const router = useRouter()
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    // `/auth/session` répond 200 avec `null` quand personne n'est connecté :
    // aucune erreur n'apparaît dans la console pour un visiteur anonyme.
    api
      .get<Utilisateur | null>('/auth/session')
      .then(setUtilisateur)
      .catch(() => setUtilisateur(null))
      .finally(() => setChargement(false))
  }, [chemin])

  async function deconnecter() {
    await api.post('/auth/deconnexion')
    setUtilisateur(null)
    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex" style={{ minHeight: '100vh' }}>
      {/* Lien d'évitement : première tabulation de la page, invisible tant
          qu'il n'a pas le focus. Sans lui, un utilisateur au clavier traverse
          toute la navigation à chaque changement d'écran. */}
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only"
        style={{
          position: 'absolute',
          top: 'var(--space-3)',
          left: 'var(--space-3)',
          zIndex: 50,
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
        }}
      >
        Aller au contenu
      </a>

      <nav
        aria-label="Navigation principale"
        className="flex flex-col border-r border-border"
        style={{
          width: 'var(--sidebar-width)',
          padding: 'var(--space-6) var(--space-4)',
          gap: 'var(--space-6)',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <Link href="/" aria-label="Personae — accueil">
          <LogoAvecNom />
        </Link>

        <ul className="flex flex-col" style={{ gap: 'var(--space-1)' }}>
          {NAVIGATION.map((entree) => {
            const actif =
              entree.href === '/' ? chemin === '/' : chemin.startsWith(entree.href)
            return (
              <li key={entree.href}>
                <Link
                  href={entree.href}
                  aria-current={actif ? 'page' : undefined}
                  className="flex items-center rounded-md transition-colors hover:bg-glass"
                  style={{
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-3)',
                    fontSize: 'var(--text-ui)',
                    fontWeight: actif ? 600 : 400,
                    color: actif ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    borderLeft: actif
                      ? '2px solid var(--color-accent)'
                      : '2px solid transparent',
                  }}
                >
                  <Icon nom={entree.icone} />
                  {entree.libelle}
                  {entree.horsPerimetre && (
                    <span
                      className="ml-auto rounded-sm uppercase"
                      style={{
                        fontSize: 'var(--text-micro)',
                        letterSpacing: 'var(--tracking-micro)',
                        color: 'var(--color-decor-muted)',
                        border: '1px solid var(--color-border)',
                        padding: '1px var(--space-1)',
                      }}
                      title="Prévu — hors périmètre de cette démonstration"
                    >
                      à venir
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>

        <div style={{ marginTop: 'auto' }}>
          {chargement ? null : utilisateur ? (
            <div className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
              <Link
                href={`/profil/?id=${utilisateur.id}`}
                className="flex items-center rounded-md transition-colors hover:bg-glass"
                style={{
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  fontSize: 'var(--text-ui)',
                  color: 'var(--color-text)',
                }}
              >
                <Icon nom="profile" />
                {utilisateur.display_name ?? utilisateur.pseudo}
              </Link>
              <button
                type="button"
                onClick={deconnecter}
                className="flex items-center rounded-md transition-colors hover:bg-glass"
                style={{
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  fontSize: 'var(--text-meta)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <Icon nom="logout" taille={14} />
                Se déconnecter
              </button>
            </div>
          ) : (
            <Link
              href="/connexion"
              className="flex items-center justify-center rounded-md font-semibold"
              style={{
                padding: 'var(--btn-padding)',
                fontSize: 'var(--text-ui)',
                background: 'var(--btn-bg-primary)',
                color: 'var(--btn-fg-primary)',
              }}
            >
              Se connecter
            </Link>
          )}
        </div>
      </nav>

      <main
        id="contenu"
        style={{
          flex: 1,
          maxWidth: 'var(--content-max-width)',
          margin: '0 auto',
          padding: 'var(--space-12) var(--space-8)',
        }}
      >
        {children}
      </main>
    </div>
  )
}

/** En-tête de section, avec un lien facultatif « tout voir ». */
export function EnTeteSection({
  titre,
  description,
  lien,
}: {
  titre: string
  description?: string | null
  lien?: { href: string; libelle: string }
}) {
  return (
    <div
      className="flex items-baseline justify-between"
      style={{ marginBottom: 'var(--space-4)' }}
    >
      <div>
        <h2 style={{ fontSize: 'var(--text-title)', fontWeight: 700 }}>{titre}</h2>
        {description && (
          <p
            style={{
              fontSize: 'var(--text-meta)',
              color: 'var(--color-text-secondary)',
              marginTop: 'var(--space-1)',
            }}
          >
            {description}
          </p>
        )}
      </div>
      {lien && (
        <Link
          href={lien.href}
          style={{ fontSize: 'var(--text-ui)', color: 'var(--color-text-accent)' }}
        >
          {lien.libelle}
        </Link>
      )}
    </div>
  )
}
