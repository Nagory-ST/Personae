/** @type {import('next').NextConfig} */

// Sous-chemin de publication. GitHub Pages sert un dépôt de projet sous
// `https://<compte>.github.io/<depot>/` : sans basePath, tous les liens et
// ressources partiraient de la racine du domaine et casseraient.
// Fourni par le workflow de déploiement ; vide en local.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

const nextConfig = {
  reactStrictMode: true,
  // Export 100 % statique : GitHub Pages ne sert que des fichiers. Toute la
  // logique serveur vit dans Supabase (fonctions `api_*`).
  output: 'export',
  basePath,
  // Chaque écran devient `ecran/index.html` : c'est la forme que GitHub Pages
  // sait servir sans réécriture d'URL.
  trailingSlash: true,
  // Aucune image tierce (D-19 révisée) ; l'optimiseur d'images de Next exige
  // un serveur, qu'un export statique n'a pas.
  images: { unoptimized: true },
  // Aucun en-tête HTTP n'est configurable sur GitHub Pages : la CSP est posée
  // par une balise <meta> dans `app/layout.tsx`.
}

module.exports = nextConfig
