import type { Metadata } from 'next'
import { AppShell } from '@/components/AppShell'
import './globals.css'

export const metadata: Metadata = {
  title: 'Personae',
  description:
    'Films, séries et livres au même endroit : noter, tenir sa collection, tirer le fil d’une œuvre à l’autre.',
  // Aucune indexation : c'est une démonstration, pas un service ouvert.
  robots: { index: false, follow: false },
  // Ne pas transmettre l'URL de la page aux sites tiers (polices).
  referrer: 'no-referrer',
}

// GitHub Pages ne permet aucun en-tête HTTP : la CSP passe par <meta>.
// Limites connues d'une CSP en <meta> : `frame-ancestors` y est ignoré (pas de
// protection anti-clickjacking possible ici), et `'unsafe-inline'` reste
// nécessaire aux scripts que Next.js insère dans le HTML exporté.
// `connect-src` n'autorise QUE le projet Supabase : un script injecté ne
// pourrait pas exfiltrer le jeton de session vers un autre domaine.
const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const CSP = [
  "default-src 'self'",
  "img-src 'self' data:",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  `connect-src 'self' ${URL_SUPABASE}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CSP} />
        {/*
          ⚠️ DERNIÈRE DÉPENDANCE RÉSEAU DU FRONT — lot L9, non terminé.
          Playfair Display et Inter sont encore servies par Google Fonts, comme
          dans les maquettes d'origine. Tant que ces fichiers ne sont pas
          hébergés localement, la démonstration n'est PAS entièrement hors
          ligne : sans réseau, les polices retombent sur les replis système et
          l'identité éditoriale se perd.
          Internaliser ces deux familles exige de les télécharger — décision de
          Kévin. Rien d'autre dans ce front ne sort sur le réseau.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
