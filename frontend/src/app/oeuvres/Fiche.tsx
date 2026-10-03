/**
 * Fiche Œuvre — écrans 3 et 5 du scénario, et **le pivot livre ↔ adaptation**.
 *
 * L'écran le plus abouti du dossier, et celui qui porte la promesse du produit :
 * depuis un film on rejoint le livre dont il est tiré, puis son auteur. Le bloc
 * « Liens » est le moment clé de la démonstration.
 *
 * Aucun chiffre n'est écrit en dur : moyenne, nombre d'avis et histogramme
 * viennent tous de l'API, qui les calcule au même endroit (CA-D3).
 */

'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { EnTeteSection } from '@/components/AppShell'
import { EtatChargement, EtatErreur, EtatVide } from '@/components/Etats'
import { Icon, IconeType } from '@/components/Icon'
import { Jaquette } from '@/components/Jaquette'
import { Distribution, Note, SaisieNote } from '@/components/Rating'
import { GrilleOeuvres, WorkCard } from '@/components/WorkCard'
import { api, ErreurApi, formaterDate, formaterNote } from '@/lib/api'
import type { Utilisateur, WorkDetail } from '@/lib/types'

const STATUTS = [
  { code: 'to_consume', libelle: 'À voir / à lire' },
  { code: 'consumed', libelle: 'Vu / lu' },
  { code: 'dropped', libelle: 'Abandonné' },
] as const

export function FicheOeuvre() {
  const slug = useSearchParams().get('slug') ?? ''
  const router = useRouter()
  const [oeuvre, setOeuvre] = useState<WorkDetail | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [connecte, setConnecte] = useState(false)
  const [enregistrement, setEnregistrement] = useState(false)

  const recharger = useCallback(() => {
    api
      .get<WorkDetail>(`/works/${slug}`)
      .then(setOeuvre)
      .catch((e: ErreurApi) => setErreur(e.message))
  }, [slug])

  useEffect(() => {
    recharger()
    api
      .get<Utilisateur | null>('/auth/session')
      .then((u) => setConnecte(u !== null))
      .catch(() => setConnecte(false))
  }, [recharger])

  async function enregistrerNote(note: number, avis: string) {
    setEnregistrement(true)
    try {
      await api.put(`/works/${slug}/avis`, { rating: note, body: avis || null })
      // On RECHARGE la fiche au lieu de patcher l'état local : la moyenne
      // affichée reste ainsi celle que la base calcule, jamais une valeur
      // reconstituée côté navigateur qui pourrait diverger.
      recharger()
    } catch (e) {
      setErreur((e as ErreurApi).message)
    } finally {
      setEnregistrement(false)
    }
  }

  async function changerStatut(statut: string) {
    try {
      // Cliquer sur le statut DÉJÀ actif le retire : l'œuvre sort de la
      // collection. Sans ça, une sélection faite par erreur était définitive —
      // on pouvait changer de statut, jamais revenir à « aucun ».
      if (oeuvre?.mon_statut_collection === statut) {
        await api.delete(`/works/${slug}/collection`)
      } else {
        await api.put(`/works/${slug}/collection`, { statut })
      }
      recharger()
    } catch (e) {
      setErreur((e as ErreurApi).message)
    }
  }

  async function retirerNote() {
    setEnregistrement(true)
    try {
      await api.delete(`/works/${slug}/avis`)
      // Même logique que pour l'enregistrement : on recharge, la moyenne
      // affichée est celle que la base recalcule sans cet avis.
      recharger()
    } catch (e) {
      setErreur((e as ErreurApi).message)
    } finally {
      setEnregistrement(false)
    }
  }

  if (erreur && !oeuvre) {
    return erreur.includes('introuvable') ? (
      <EtatVide
        titre="Cette œuvre n'existe pas"
        message="Le lien est peut-être erroné, ou l'œuvre ne fait pas partie du jeu de démonstration."
        action={{ libelle: 'Explorer le catalogue', href: '/explorer' }}
      />
    ) : (
      <EtatErreur message={erreur} />
    )
  }
  if (!oeuvre) return <EtatChargement lignes={4} />

  const annee = oeuvre.release_date?.slice(0, 4)

  return (
    <article className="flex flex-col" style={{ gap: 'var(--space-12)' }}>
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center self-start transition-colors"
        style={{
          gap: 'var(--space-2)',
          fontSize: 'var(--text-ui)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <Icon nom="back" taille={16} />
        Retour
      </button>

      <header className="flex" style={{ gap: 'var(--space-8)' }}>
        <Jaquette titre={oeuvre.title} type={oeuvre.type} largeur={200} hauteur={294} />

        <div className="flex flex-col" style={{ gap: 'var(--space-4)', flex: 1 }}>
          <div>
            <h1
              className="font-display"
              style={{
                fontSize: 'var(--text-display)',
                fontWeight: 700,
                letterSpacing: 'var(--tracking-title)',
              }}
            >
              {oeuvre.title}
            </h1>
            {oeuvre.original_title && oeuvre.original_title !== oeuvre.title && (
              <p
                style={{
                  fontSize: 'var(--text-body)',
                  color: 'var(--color-text-secondary)',
                  fontStyle: 'italic',
                }}
              >
                {oeuvre.original_title}
              </p>
            )}
          </div>

          <div
            className="flex items-center flex-wrap"
            style={{
              gap: 'var(--space-3)',
              fontSize: 'var(--text-meta)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <span className="flex items-center" style={{ gap: 'var(--space-2)' }}>
              <IconeType type={oeuvre.type} />
              {oeuvre.type_label}
            </span>
            <span>{formaterDate(oeuvre.release_date, oeuvre.date_precision)}</span>
            {oeuvre.runtime_minutes && <span>{oeuvre.runtime_minutes} min</span>}
            {typeof oeuvre.attributes.pages === 'number' && (
              <span>{oeuvre.attributes.pages} pages</span>
            )}
            {typeof oeuvre.attributes.seasons === 'number' && (
              <span>
                {oeuvre.attributes.seasons} saisons · {String(oeuvre.attributes.episodes)} épisodes
              </span>
            )}
          </div>

          <div className="flex flex-wrap" style={{ gap: 'var(--space-2)' }}>
            {oeuvre.genres.map((genre) => (
              <Link
                key={genre.slug}
                href={`/explorer?genre=${genre.slug}`}
                className="rounded-sm border border-border transition-colors hover:bg-glass"
                style={{
                  padding: 'var(--tag-padding)',
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {genre.label}
              </Link>
            ))}
          </div>

          <div className="flex items-end" style={{ gap: 'var(--space-8)' }}>
            <Note valeur={oeuvre.rating_average} nombre={oeuvre.rating_count} taille="grande" />
            {oeuvre.rating_count > 0 && (
              <div style={{ width: 220 }}>
                <Distribution donnees={oeuvre.distribution} />
              </div>
            )}
          </div>

          {oeuvre.synopsis && (
            <p style={{ fontSize: 'var(--text-body)', maxWidth: 620 }}>{oeuvre.synopsis}</p>
          )}

          {connecte && (
            <div className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
              <div className="flex" style={{ gap: 'var(--space-2)' }}>
                {STATUTS.map((statut) => {
                  const actif = oeuvre.mon_statut_collection === statut.code
                  return (
                    <button
                      key={statut.code}
                      type="button"
                      onClick={() => changerStatut(statut.code)}
                      aria-pressed={actif}
                      // Le libellé accessible dit ce que le clic va FAIRE, pas
                      // seulement l'état : un lecteur d'écran annonce « retirer ».
                      aria-label={
                        actif
                          ? `${statut.libelle} — sélectionné, cliquer pour retirer de ma collection`
                          : statut.libelle
                      }
                      title={actif ? 'Cliquer à nouveau pour retirer' : undefined}
                      className="rounded-md border transition-colors"
                      style={{
                        padding: 'var(--space-2) var(--space-3)',
                        fontSize: 'var(--text-meta)',
                        borderColor: actif ? 'var(--color-accent)' : 'var(--color-border)',
                        color: actif ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                        background: actif ? 'var(--color-surface-glass)' : 'transparent',
                      }}
                    >
                      {statut.libelle}
                    </button>
                  )
                })}
              </div>
              {/* Indication visible, pas seulement au survol : l'utilisateur
                  doit savoir qu'un choix se défait, sans avoir à le deviner. */}
              <span
                style={{ fontSize: 'var(--text-micro)', color: 'var(--color-text-secondary)' }}
              >
                {oeuvre.mon_statut_collection
                  ? 'Dans ma collection — cliquer à nouveau sur le statut pour la retirer.'
                  : 'Choisir un statut pour ajouter à ma collection.'}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ------------------------------------------------------------------
          LE PIVOT — le moment clé de la démonstration.
          Ce que ni Letterboxd ni Goodreads ne font : passer de l'écran au
          livre et inversement, dans les deux sens.
      ------------------------------------------------------------------ */}
      {oeuvre.relations.length > 0 && (
        <section>
          <EnTeteSection
            titre="Liens"
            description="Ce que cette œuvre doit à d'autres, et ce qu'elle a inspiré."
          />
          <ul className="flex flex-wrap" style={{ gap: 'var(--space-6)' }}>
            {oeuvre.relations.map((relation) => (
              <li key={`${relation.label}-${relation.work.id}`}>
                <WorkCard
                  oeuvre={relation.work}
                  complement={
                    <span
                      className="rounded-sm uppercase"
                      style={{
                        fontSize: 'var(--text-micro)',
                        letterSpacing: 'var(--tracking-micro)',
                        color: 'var(--color-accent)',
                        border: '1px solid var(--color-border)',
                        padding: '1px var(--space-1)',
                        alignSelf: 'flex-start',
                      }}
                    >
                      {relation.label}
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {oeuvre.credits.length > 0 && (
        <section>
          <EnTeteSection titre="Distribution" />
          <ul className="flex flex-wrap" style={{ gap: 'var(--space-4)' }}>
            {oeuvre.credits.map((personne) => (
              <li key={`${personne.id}-${personne.role}-${personne.character_name}`}>
                <Link
                  href={`/personnes/?id=${personne.id}`}
                  className="flex flex-col rounded-md border border-border transition-colors hover:bg-glass"
                  style={{ padding: 'var(--space-3) var(--space-4)', gap: 2, minWidth: 180 }}
                >
                  <span style={{ fontSize: 'var(--text-ui)', fontWeight: 600 }}>
                    {personne.full_name}
                  </span>
                  <span
                    style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-secondary)' }}
                  >
                    {personne.character_name ?? traduireRole(personne.role)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <EnTeteSection titre="Avis" />
        {connecte ? (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <SaisieNote
              valeurInitiale={oeuvre.ma_note}
              avisInitial={oeuvre.mon_avis}
              onEnregistrer={enregistrerNote}
              onRetirer={retirerNote}
              enCours={enregistrement}
            />
          </div>
        ) : (
          <p
            style={{
              fontSize: 'var(--text-meta)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <Link href="/connexion" style={{ color: 'var(--color-text-accent)' }}>
              Connectez-vous
            </Link>{' '}
            pour noter cette œuvre.
          </p>
        )}

        {oeuvre.avis.length === 0 ? (
          <EtatVide
            titre="Aucun avis pour le moment"
            message="Soyez le premier à donner votre avis sur cette œuvre."
          />
        ) : (
          <ul className="flex flex-col" style={{ gap: 'var(--space-4)' }}>
            {oeuvre.avis.map((avis) => (
              <li
                key={avis.id}
                className="rounded-lg border border-border bg-glass"
                style={{ padding: 'var(--card-padding)' }}
              >
                <div
                  className="flex items-baseline"
                  style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}
                >
                  <Link
                    href={`/profil/?id=${avis.auteur_id}`}
                    style={{
                      fontSize: 'var(--text-ui)',
                      fontWeight: 600,
                      color: 'var(--color-text-accent)',
                    }}
                  >
                    {avis.auteur_pseudo}
                  </Link>
                  <span
                    className="font-display font-bold"
                    style={{ fontSize: 'var(--text-heading)', color: 'var(--color-accent)' }}
                  >
                    {formaterNote(avis.rating)}
                  </span>
                  <span
                    style={{ fontSize: 'var(--text-meta)', color: 'var(--color-text-secondary)' }}
                  >
                    {avis.created_at.split('-').reverse().join('/')}
                  </span>
                </div>
                {/* Rendu comme du TEXTE : React échappe, aucune balise n'est
                    interprétée. C'est la contrepartie du stockage brut. */}
                {avis.body && <p style={{ fontSize: 'var(--text-body)' }}>{avis.body}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {oeuvre.similaires.length > 0 && (
        <section>
          <EnTeteSection
            titre="Dans le même esprit"
            description="Proximité par genres partagés — aucune recommandation opaque."
          />
          <GrilleOeuvres oeuvres={oeuvre.similaires} variante="compact" />
        </section>
      )}

      {oeuvre.source && (
        <footer
          className="border-t border-border"
          style={{
            paddingTop: 'var(--space-4)',
            fontSize: 'var(--text-micro)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {oeuvre.source.attribution_text}
        </footer>
      )}
    </article>
  )
}

function traduireRole(role: string | null): string {
  if (role === 'realisateur') return 'Réalisation'
  if (role === 'auteur') return 'Écriture'
  if (role === 'createur') return 'Création'
  if (role === 'acteur') return 'Interprétation'
  return ''
}
