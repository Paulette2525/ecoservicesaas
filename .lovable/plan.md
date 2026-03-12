

# Enregistrement audio post-création de visite

## Flux utilisateur
1. Le commercial remplit le formulaire de visite (client, date, statut, notes) et clique "Créer"
2. La visite est sauvegardée en base — au lieu de fermer le dialog, un **nouveau dialog "Enregistrer l'échange"** s'ouvre avec l'ID de la visite créée
3. Le commercial clique sur 🎙️ **"Enregistrer l'échange"** → enregistrement audio via `MediaRecorder` du navigateur
4. Il clique "Arrêter" → le fichier audio est uploadé dans le bucket `visit-recordings`
5. L'audio est envoyé à une edge function de transcription (ElevenLabs STT batch) → transcription stockée dans `visits.transcription`
6. La transcription est envoyée à une edge function de résumé IA (Lovable AI / Gemini) → résumé stocké dans `visits.summary` et pré-rempli dans `visits.report`
7. L'admin/manager voit la transcription et le résumé dans la liste des visites

## Prérequis : clé API ElevenLabs
- L'utilisateur devra fournir sa clé API ElevenLabs via le gestionnaire de secrets (nécessaire pour la transcription STT)

## Composants à créer/modifier

### 1. Edge function `elevenlabs-transcribe`
- Reçoit un fichier audio en FormData
- Appelle `https://api.elevenlabs.io/v1/speech-to-text` avec `model_id: "scribe_v2"`, `language_code: "fra"`, `diarize: true`
- Retourne la transcription texte

### 2. Edge function `visit-summary`
- Reçoit la transcription texte + contexte (client, date)
- Appelle Lovable AI (Gemini) avec un prompt système en français pour extraire : résumé, produits mentionnés, besoins, objections, prochaines actions
- Retourne le résumé formaté

### 3. Composant `VisitRecorder` (nouveau)
- Dialog avec bouton 🎙️ "Enregistrer l'échange"
- Utilise `MediaRecorder` API pour capturer l'audio du micro
- Affiche un indicateur d'enregistrement en cours (durée, animation)
- Bouton "Arrêter l'enregistrement"
- Après arrêt : upload audio → transcription → résumé IA
- Affiche la transcription et le résumé avec possibilité de valider/modifier
- Bouton "Terminer" pour fermer

### 4. Modification de `Visits.tsx`
- Après `handleSave` en mode création : au lieu de fermer, ouvrir le `VisitRecorder` avec l'ID de la visite créée
- Ajouter colonnes transcription/résumé visibles pour admin/manager dans le tableau
- Ajouter un bouton 🎙️ sur chaque visite existante pour enregistrer a posteriori

### 5. Config
- Ajouter les deux edge functions dans `supabase/config.toml`
- Demander la clé `ELEVENLABS_API_KEY` via le gestionnaire de secrets

## Architecture technique

```text
[Commercial]
  │
  ├─ Crée visite → DB insert
  │
  ├─ Enregistre audio → MediaRecorder API
  │     │
  │     ├─ Upload → Storage (visit-recordings)
  │     │
  │     ├─ POST audio → Edge fn elevenlabs-transcribe
  │     │     └─ → ElevenLabs STT API → transcription
  │     │
  │     └─ POST transcription → Edge fn visit-summary
  │           └─ → Lovable AI (Gemini) → résumé
  │
  └─ Update visite (transcription, summary, audio_url, report)

[Admin/Manager]
  └─ Voit transcription + résumé dans la fiche visite
```

