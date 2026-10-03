import { EtatHorsPerimetre } from '@/components/Etats'

/**
 * Débats — hors périmètre, décision de Kévin du 19/08 (« arrivera plus tard »).
 *
 * L'écran existe et dit pourquoi il est vide. Si le commanditaire clique ici,
 * il doit lire un choix assumé, jamais une 404 qui ressemble à un oubli.
 */
export default function PageDebats() {
  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-6)' }}>
      <h1 className="font-display" style={{ fontSize: 'var(--text-display)', fontWeight: 700 }}>
        Débats
      </h1>
      <EtatHorsPerimetre
        titre="Les débats viendront plus tard"
        quand="Un espace de discussion public par œuvre suppose un dispositif de modération assumé (obligations DSA), et une base d'utilisateurs réelle avec qui débattre. La maquette existe, le chantier est cadré au backlog."
      />
    </div>
  )
}
