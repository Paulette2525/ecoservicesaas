

# Transformer l'application en app native avec Capacitor

L'approche Capacitor va wrapper l'application web existante dans une coque native iOS/Android, donnant un accès fiable au micro et au système de fichiers même hors ligne.

## Ce que je vais faire

### 1. Installer les dépendances Capacitor
- `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`

### 2. Initialiser Capacitor
- Créer `capacitor.config.ts` avec :
  - `appId: app.lovable.ca43ea4c00d24774a6350ea4d10d7312`
  - `appName: ecoservicesaas`
  - Hot-reload configuré vers la preview sandbox

### 3. Le mode hors ligne existant reste en place
- L'IndexedDB + `useOfflineSync` déjà implémentés fonctionneront dans l'app native
- Capacitor donne un meilleur accès au micro et une meilleure fiabilité en arrière-plan

## Ce que tu devras faire ensuite (sur ton ordinateur)

1. Exporter le projet vers GitHub via le bouton "Export to Github"
2. `git clone` puis `npm install`
3. `npx cap add ios` et/ou `npx cap add android`
4. `npx cap update ios` / `npx cap update android`
5. `npm run build`
6. `npx cap sync`
7. `npx cap run android` ou `npx cap run ios`

**Prérequis :** Xcode (Mac) pour iOS, Android Studio pour Android.

---

Pour plus de détails, consulte le [guide Capacitor sur le blog Lovable](https://lovable.dev/blog/lovable-capacitor).

