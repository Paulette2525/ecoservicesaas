

# Proteger les enregistrements contre la modification par les commerciaux

## Objectif
Les commerciaux peuvent enregistrer plusieurs fois (nouvel enregistrement), mais ne peuvent pas modifier manuellement le texte de la transcription, du resume ou du rapport genere par l'IA. Seuls les admins/managers peuvent editer ces champs.

## Modifications

### 1. `src/pages/Visits.tsx`
- Dans le formulaire d'edition (`openEdit`), empecher la modification du champ "Notes/Rapport" si la visite a deja une transcription et que l'utilisateur n'est pas admin/manager : rendre le champ `report` en lecture seule (`readOnly` ou `disabled`) pour les commerciaux quand `editing.transcription` existe
- Permettre toujours le bouton "Ajouter des notes" (re-enregistrement) meme si une transcription existe deja — retirer la condition `!v.transcription` du bouton recorder pour permettre le re-enregistrement
- Le re-enregistrement ecrasera les anciennes valeurs (transcription, summary, report, audio_url)

### 2. `src/components/VisitRecorder.tsx`
- Aucun changement necessaire : le composant ecrit directement en base sans interface de modification de texte — le commercial ne voit jamais la transcription/resume

### 3. `src/pages/Visits.tsx` — Dialog detail admin
- Deja en lecture seule pour les admins (affichage dans des `<div>` sans inputs editables) — pas de changement

### Resume des regles
- Commercial : peut re-enregistrer (nouveau audio → nouvelle transcription/resume), ne peut PAS editer manuellement transcription/summary/report une fois qu'un enregistrement existe
- Admin/Manager : peut voir et editer tous les champs

