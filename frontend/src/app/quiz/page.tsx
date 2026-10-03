import { EtatHorsPerimetre } from '@/components/Etats'

/** Quiz — hors périmètre de la démonstration, comme les débats. */
export default function PageQuiz() {
  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-6)' }}>
      <h1 className="font-display" style={{ fontSize: 'var(--text-display)', fontWeight: 700 }}>
        Quiz
      </h1>
      <EtatHorsPerimetre
        titre="Les quiz viendront plus tard"
        quand="Cinq questions hebdomadaires sur les œuvres notées : l'idée est au brief, elle n'est pas au périmètre de cette démonstration."
      />
    </div>
  )
}
