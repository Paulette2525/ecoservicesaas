

# Fiabiliser le flux de synchronisation hors ligne

## État actuel

- Le fournisseur ElevenLabs est de nouveau opérationnel (le token scribe retourne 200 OK)
- Le flux de synchronisation hors ligne a deux problèmes résiduels :

### Problème 1 : Erreurs ElevenLabs mal propagées
La fonction `elevenlabs-transcribe` retourne toujours un status 500 générique, sans parser le JSON d'erreur d'ElevenLabs. Le `parseSyncError` du client cherche `provider_status` mais la fonction ne l'envoie jamais.

### Problème 2 : Risque de timeout persistant
Le flux de sync hors ligne envoie toujours le fichier audio complet à `elevenlabs-transcribe` (batch). Pour les longs enregistrements, le timeout de 150s reste un risque.

## Plan

### 1. Améliorer la propagation d'erreurs dans `elevenlabs-transcribe`
**Fichier : `supabase/functions/elevenlabs-transcribe/index.ts`**
- Parser le JSON d'erreur ElevenLabs pour extraire `detail.status` et `detail.message`
- Renvoyer `provider_status` dans la réponse pour que `parseSyncError` fonctionne
- Transmettre le vrai status HTTP (401, 402, 429) au lieu de toujours 500

### 2. Ajouter un chunking audio pour les longs enregistrements
**Fichier : `src/hooks/useOfflineSync.ts`**
- Si le blob audio dépasse 5 Mo, le découper en segments de ~4 Mo
- Envoyer chaque segment séparément à `elevenlabs-transcribe`
- Concaténer les transcriptions dans l'ordre
- Cela évite les timeouts pour les enregistrements de 10+ minutes

### 3. Ajouter un retry automatique avec backoff
**Fichier : `src/hooks/useOfflineSync.ts`**
- En cas d'erreur réseau (pas une erreur fournisseur), réessayer 1 fois après 3 secondes
- Ne pas réessayer sur les erreurs de paiement/crédits

### Résultat attendu
- Les enregistrements hors ligne de toute durée se synchronisent correctement
- Les erreurs fournisseur sont affichées clairement à l'utilisateur
- Le système retente automatiquement les erreurs transitoires

