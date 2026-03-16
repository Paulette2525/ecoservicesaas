

# Mode hors ligne pour l'enregistrement de visites

## Architecture

L'enregistrement audio fonctionne déjà via `MediaRecorder` (pas besoin d'internet). Le traitement (upload, transcription, résumé) nécessite une connexion. L'idée : sauvegarder l'audio dans IndexedDB quand hors ligne, puis synchroniser automatiquement au retour de la connexion.

## Fichiers à créer

### 1. `src/lib/offlineDb.ts` — Couche IndexedDB
- Ouvrir/créer une base `visit-offline-db` avec un object store `pending-recordings`
- Chaque entrée : `{ id, visitId, clientName, visitDate, audioBlob, createdAt, status: 'pending' | 'syncing' }`
- Fonctions CRUD : `savePendingRecording()`, `getPendingRecordings()`, `deletePendingRecording()`

### 2. `src/hooks/useOnlineStatus.ts` — Hook statut réseau
- Écoute `navigator.onLine` + événements `online`/`offline`
- Retourne `{ isOnline: boolean }`

### 3. `src/hooks/useOfflineSync.ts` — Logique de synchronisation
- Au retour en ligne, récupère tous les enregistrements en attente dans IndexedDB
- Pour chacun, exécute le pipeline existant (upload → transcription → résumé → update visit)
- Supprime de IndexedDB après succès
- Expose `{ pendingCount, isSyncing }`

### 4. `src/components/OnlineStatusIndicator.tsx` — Indicateur visuel
- Petit badge dans le header (AppLayout) : vert = en ligne, rouge = hors ligne
- Affiche le nombre d'enregistrements en attente si > 0
- Popover au clic montrant la liste des enregistrements en file d'attente avec client/date

## Fichiers à modifier

### 5. `src/components/VisitRecorder.tsx`
- Dans `processAudio()`, vérifier `navigator.onLine`
- **Si en ligne** : comportement actuel (upload + transcription + résumé)
- **Si hors ligne** : sauvegarder le blob audio dans IndexedDB via `savePendingRecording()`, afficher toast "Enregistrement sauvegardé hors ligne", passer à `done`

### 6. `src/components/AppLayout.tsx`
- Ajouter `OnlineStatusIndicator` dans le header à côté du `SidebarTrigger`
- Intégrer le hook `useOfflineSync` pour déclencher la synchro automatique au niveau app

## Flux utilisateur

1. Le commercial enregistre une visite normalement
2. S'il est hors ligne au moment du stop → audio sauvé dans IndexedDB, toast "Sauvegardé hors ligne"
3. Un badge orange apparaît dans le header avec le nombre d'enregistrements en attente
4. Dès que la connexion revient → synchronisation automatique en arrière-plan
5. Toast de confirmation pour chaque enregistrement synchronisé
6. Le badge disparaît quand la file est vide

## Détails techniques

- **IndexedDB** : API native du navigateur, pas de dépendance supplémentaire. Supporte les Blobs nativement.
- **Synchronisation** : traitement séquentiel (un à un) pour éviter de surcharger les edge functions
- **Résilience** : si la synchro échoue sur un enregistrement, il reste dans IndexedDB pour réessai ultérieur
- **Pas de modification de base de données** nécessaire

