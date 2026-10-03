// Contournement d'un défaut de l'export statique de Next 16 : les segments de
// préchargement sont écrits sous `__next.<segment>/__PAGE__.txt`, mais le
// routeur client les demande sous `__next.<segment>.__PAGE__.txt`. Sans copie,
// chaque préchargement tombe en 404 et chaque clic recharge la page entière.
// On ajoute donc la forme « à points » à côté de la forme « dossier ».
import { copyFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const racine = process.argv[2] ?? 'out'
let copies = 0

function parcourir(dossier) {
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom)
    if (!statSync(chemin).isDirectory()) continue
    if (nom.startsWith('__next.')) aplatir(chemin, join(dossier, nom))
    else parcourir(chemin)
  }
}

function aplatir(dossierSegment, prefixe) {
  for (const nom of readdirSync(dossierSegment)) {
    const chemin = join(dossierSegment, nom)
    if (statSync(chemin).isDirectory()) aplatir(chemin, `${prefixe}.${nom}`)
    else {
      copyFileSync(chemin, `${prefixe}.${nom}`)
      copies++
    }
  }
}

parcourir(racine)
console.log(`Export corrigé : ${copies} segment(s) de préchargement dupliqué(s).`)
