

# Diagnostic : Enregistrements tronqués

## Problèmes identifiés

L'architecture actuelle enregistre **tout l'audio en mémoire**, puis après l'arrêt, envoie le fichier complet à une fonction backend pour transcription. Trois problèmes :

1. **Timeout de la fonction backend** : La fonction de transcription a un timeout de 150 secondes. Un enregistrement de 5-10 minutes génère un fichier de 5-15 Mo qui peut prendre trop longtemps à traiter → la fonction est coupée, seul le début est transcrit ou rien ne revient.

2. **Limite de taille du body** : Les fonctions backend ont une limite sur la taille des requêtes. Les fichiers audio longs peuvent être tronqués silencieusement.

3. **Perte de données en cas d'erreur** : Si le traitement échoue après l'arrêt, tout l'enregistrement est perdu car il n'est sauvegardé nulle part avant le traitement.

## Solution proposée : Transcription en temps réel

Remplacer le flux "enregistrer tout → envoyer à la fin" par une **transcription en temps réel** via ElevenLabs Realtime Scribe. L'audio est transcrit pendant que le commercial parle — plus de fichier volumineux à envoyer après coup.

### 1. Nouvelle fonction backend : `elevenlabs-scribe-token`
- Génère un token à usage unique pour la connexion WebSocket ElevenLabs
- Appel léger, pas de timeout possible
- Le token expire après 15 minutes

### 2. Refonte du composant `VisitRecorder.tsx`
- Installer `@elevenlabs/react` et utiliser le hook `useScribe`
- Au clic "Démarrer" : demander un token, puis ouvrir la connexion WebSocket avec le micro
- La transcription arrive **en direct** (partielle puis confirmée) pendant l'enregistrement
- Afficher la transcription en cours dans le widget pour que le commercial voie que ça fonctionne
- Au clic "Stop" : déconnecter, assembler le texte final, envoyer au résumé IA

### 3. Flux simplifié après l'arrêt
- Plus besoin d'uploader un fichier audio volumineux
- Envoyer directement le texte transcrit à la fonction `visit-summary` pour le résumé
- L'upload audio (optionnel, pour archivage) reste possible en parallèle mais n'est plus bloquant

### 4. Mode hors ligne préservé
- Si hors ligne au démarrage, retomber sur l'ancien mode (enregistrement local + sync plus tard)
- La transcription temps réel nécessite une connexion internet

### Fichiers modifiés
- `supabase/functions/elevenlabs-scribe-token/index.ts` — nouvelle fonction (token)
- `src/components/VisitRecorder.tsx` — refonte avec `useScribe`
- `package.json` — ajout de `@elevenlabs/react`

### Résultat attendu
- Enregistrements de **n'importe quelle durée** transcrits intégralement
- Le commercial voit le texte apparaître en direct → confirmation visuelle
- Plus de timeout, plus de fichier tronqué
- Rapports complets pour l'administrateur

