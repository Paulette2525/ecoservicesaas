

# Rendre l'enregistrement hors ligne fonctionnel — PWA + cache

## Le vrai problème

Le code d'enregistrement hors ligne (IndexedDB, sync auto) est déjà en place. Mais il ne fonctionne pas car **l'application elle-même ne peut pas se charger sans connexion** : sans Service Worker, le navigateur ne peut pas afficher la page quand il n'y a pas de réseau. Résultat : l'utilisateur ne peut jamais atteindre le bouton d'enregistrement.

## Solution

Transformer l'app en **PWA** (Progressive Web App) avec un Service Worker qui met en cache les fichiers de l'application. Ainsi, même sans connexion, l'app se charge et l'utilisateur peut enregistrer.

## Ce que je vais faire

### 1. Installer `vite-plugin-pwa`
- Ajouter le package `vite-plugin-pwa` dans les dépendances

### 2. Configurer le Service Worker dans `vite.config.ts`
- Ajouter le plugin VitePWA avec :
  - Mode `generateSW` (génération automatique du Service Worker)
  - Cache de tous les fichiers statiques (JS, CSS, HTML, images)
  - Exclure les chemins d'authentification (`/~oauth`)

### 3. Ajouter le `manifest.json` dans la config PWA
- Nom : EcoService SaaS
- Couleur thème : #1e3a5f (bleu corporate)
- Icônes 192x192 et 512x512 (générées en SVG simple)
- `display: standalone` pour une expérience native

### 4. Mettre à jour `index.html`
- Ajouter les meta-tags mobile : `theme-color`, `apple-mobile-web-app-capable`, `apple-touch-icon`
- Mettre le bon titre "EcoService"

### 5. Créer les icônes PWA
- `public/pwa-192x192.png` et `public/pwa-512x512.png`

### 6. Supprimer `capacitor.config.ts`
- Plus nécessaire avec l'approche PWA

## Résultat pour l'utilisateur

1. Il ouvre l'app sur son téléphone (avec connexion) — le Service Worker se met en cache
2. Il va sur le terrain, perd la connexion
3. L'app se charge quand même grâce au cache du Service Worker
4. Il ouvre une visite, enregistre la conversation, valide
5. L'audio est stocké dans IndexedDB (déjà implémenté)
6. Quand la connexion revient → transcription + résumé se font automatiquement (déjà implémenté)
7. L'admin reçoit directement les notes dans la fiche visite

## Point important
L'utilisateur doit d'abord créer la visite **avec connexion** (sélection du client, date, etc.), puis il peut aller sur le terrain et enregistrer hors ligne. La liste des visites sera aussi mise en cache localement pour être accessible hors ligne.

