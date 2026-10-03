// Garde anti-fuite : refuse de publier un build qui contient une clé Supabase
// à privilèges. Cherche des VALEURS, pas des mots : supabase-js contient
// lui-même la chaîne « sb_secret_ » (il teste le préfixe des clés), ce qui
// rendait un simple grep faux positif.
//   - clé secrète moderne : sb_secret_<24+ caractères> ;
//   - clé historique : JWT dont la charge utile décodée porte un rôle autre
//     que `anon` (typiquement `service_role`).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const racine = process.argv[2] ?? 'out'
const CLE_SECRETE = /sb_secret_[A-Za-z0-9_-]{24,}/g
const JWT = /eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g

function* fichiers(dossier) {
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom)
    if (statSync(chemin).isDirectory()) yield* fichiers(chemin)
    else if (/\.(js|html|txt|json|css|map)$/.test(nom)) yield chemin
  }
}

const fuites = []
for (const chemin of fichiers(racine)) {
  const texte = readFileSync(chemin, 'utf8')
  for (const m of texte.matchAll(CLE_SECRETE)) fuites.push(`${chemin} : clé sb_secret_…`)
  for (const m of texte.matchAll(JWT)) {
    try {
      const charge = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8'))
      if (charge.role && charge.role !== 'anon') fuites.push(`${chemin} : JWT rôle « ${charge.role} »`)
    } catch {
      /* pas un JWT Supabase */
    }
  }
}

if (fuites.length) {
  console.error('Secret Supabase détecté dans le build — publication refusée :')
  for (const f of fuites) console.error('  ' + f)
  process.exit(1)
}
console.log(`Aucun secret dans ${racine}/.`)
