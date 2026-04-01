
# Corriger la synchro hors ligne qui ne démarre pas

## Diagnostic retenu

Le problème principal n’est plus seulement la transcription elle-même.

### Cause racine la plus probable
Quand un enregistrement est sauvegardé hors ligne :
- `VisitRecorder` appelle bien `savePendingRecording(...)`
- mais `useOfflineSync` n’est **jamais notifié**
- donc `pendingCount` reste à `0`
- le badge n’apparaît pas correctement
- et surtout l’auto-sync au retour en ligne ne se déclenche pas, car il dépend de `pendingCount > 0`

Autrement dit : l’audio est probablement stocké localement, mais la file d’attente affichée par l’app n’est pas rafraîchie.

### Problème secondaire déjà visible dans les logs
Les logs backend montrent aussi des erreurs fournisseur `401 payment_issue` sur `elevenlabs-transcribe`. Donc même après correction de la file d’attente :
- l’upload audio peut réussir
- mais la transcription peut encore échouer si le fournisseur refuse la requête

Il faut donc corriger **les deux niveaux** :
1. démarrage réel de la synchro
2. gestion claire des échecs de transcription

---

## Plan d’implémentation

### 1. Rendre la file hors ligne réactive
**Fichiers :**
- `src/lib/offlineDb.ts`
- `src/hooks/useOfflineSync.ts`
- `src/components/VisitRecorder.tsx`

**À faire :**
- émettre un événement applicatif après chaque `savePendingRecording`, `updatePendingRecording`, `updateRecordingStatus`, `deletePendingRecording`
- écouter cet événement dans `useOfflineSync` pour relancer `refreshPending()`
- après sauvegarde hors ligne, forcer aussi un refresh immédiat

**Effet attendu :**
- le compteur passe tout de suite à 1, 2, 3…
- le bouton de synchronisation devient fiable
- au retour en ligne, `syncAll()` se déclenche réellement

---

### 2. Fiabiliser le déclenchement automatique
**Fichier :** `src/hooks/useOfflineSync.ts`

**À faire :**
- déclencher `syncAll()` directement à l’événement `online`, pas seulement via `pendingCount`
- ajouter une vérification au mount si des éléments sont déjà en attente
- éviter qu’un état React stale bloque la reprise

**Effet attendu :**
- pas besoin de recharger la page pour lancer la synchro
- une reconnexion réseau suffit

---

### 3. Uniformiser l’appel de transcription
**Fichier :** `src/hooks/useOfflineSync.ts`

**À faire :**
- remplacer le `fetch(.../functions/v1/elevenlabs-transcribe)` manuel par `supabase.functions.invoke("elevenlabs-transcribe", ...)`
- garder le chunking et le retry existants

**Pourquoi :**
- gestion d’erreur plus propre
- cohérence avec `visit-summary`
- moins de risques liés aux headers/auth/CORS

---

### 4. Ne plus bloquer silencieusement quand la transcription échoue
**Fichiers :**
- `src/hooks/useOfflineSync.ts`
- `src/pages/Visits.tsx` ou composant d’affichage des visites

**À faire :**
- conserver `audio_url` même si la transcription échoue
- afficher un état clair du type :
  - audio reçu
  - transcription en attente
  - transcription échouée
  - synchronisée
- afficher le message d’erreur utile à l’utilisateur/admin

**Effet attendu :**
- le commercial ne perd jamais l’enregistrement
- l’admin voit qu’un audio existe même si le texte n’est pas encore généré

---

### 5. Option recommandée : persister un vrai statut de synchro en base
**Backend : migration + UI**
- ajouter sur `visits` des champs du type :
  - `sync_status`
  - `sync_error`
  - `audio_uploaded_at`
  - `transcription_completed_at`

**Pourquoi :**
L’état actuel n’existe que dans IndexedDB côté navigateur. Dès qu’on change d’appareil ou de session, on perd la visibilité opérationnelle.

**Bénéfice :**
- suivi admin fiable
- relance ciblée des visites en échec
- meilleur support terrain

---

## Ordre conseillé

1. Corriger la réactivité IndexedDB → `pendingCount`
2. Corriger le déclenchement auto au retour en ligne
3. Uniformiser l’appel backend de transcription
4. Ajouter un statut lisible dans l’UI
5. En option, persister ce statut en base

---

## Détails techniques

```text
Aujourd’hui
Enregistrement hors ligne
  → savePendingRecording()
  → IndexedDB mise à jour
  → useOfflineSync non notifié
  → pendingCount reste à 0
  → pas d’auto-sync fiable

Après correctif
Enregistrement hors ligne
  → savePendingRecording()
  → event "offline-recordings-changed"
  → useOfflineSync.refreshPending()
  → pendingCount mis à jour
  → retour en ligne
  → syncAll()
  → upload audio
  → transcription
  → résumé
  → mise à jour visite
```

---

## Résultat attendu

Après ces corrections :
- un enregistrement hors ligne apparaît immédiatement dans la file d’attente
- la synchronisation démarre réellement au retour en ligne
- l’audio n’est plus “perdu” même si la transcription échoue
- l’admin voit enfin où ça bloque : upload, transcription ou résumé
- si le fournisseur transcription est encore indisponible, l’app continue de remonter un statut clair au lieu de sembler “ne rien faire”
