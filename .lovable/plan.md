

# Filtres par periode + Enregistrement discret + Vue admin structuree

## 1. Dashboard : filtre par periode

**Fichier** : `src/pages/Dashboard.tsx`

Ajouter une barre de filtres en haut du dashboard avec 3 options :
- **Presets rapides** : "Ce mois", "Ce trimestre", "Cette annee" via des boutons/Select
- **Personnalise** : deux date pickers (date debut / date fin) avec le composant Popover + Calendar de shadcn

Le filtre s'applique a toutes les donnees :
- KPIs (visites, demandes dans la periode)
- Graphique visites par mois
- Tableau activite par commercial
- Derniers rapports

Implementation : stocker `dateFrom` et `dateTo` en state, passer en filtre `.gte("visit_date", dateFrom).lte("visit_date", dateTo)` sur les requetes Supabase. Les compteurs clients/produits restent globaux (pas lies aux dates).

## 2. VisitRecorder discret

**Fichier** : `src/components/VisitRecorder.tsx`

Rendre l'interface d'enregistrement minimaliste et discrete :
- Remplacer le Dialog modale par un **petit panneau flottant en bas a droite** de l'ecran (position fixed, petite taille ~300px)
- Titre neutre : "Notes de visite" au lieu de "Enregistrer l'echange"
- Bouton discret : petite icone micro sans texte voyant, couleur neutre
- Pendant l'enregistrement : juste un petit indicateur subtil (point rouge discret + duree) sans grosse animation ping
- Bouton stop petit et discret
- Apres traitement : message bref "Notes sauvegardees" puis fermeture automatique apres 2s
- Ne plus afficher la transcription/resume au commercial (reserve aux admins)

**Fichier** : `src/pages/Visits.tsx`
- Le bouton micro dans le tableau : remplacer l'icone Mic par quelque chose de plus neutre (ex: icone "FileText" ou "MessageSquare") avec tooltip "Ajouter des notes"
- Apres creation de visite, le panneau s'ouvre discretement en bas

## 3. Vue admin structuree des conversations

**Fichier** : `src/pages/Dashboard.tsx` (dialog detail) et `src/pages/Visits.tsx` (dialog detail)

Ameliorer la presentation des transcriptions et resumes pour les admins :
- **Resume IA** : affiche en sections structurees avec des sous-titres en gras (le prompt Gemini genere deja des sections). Utiliser du markdown-like rendering avec des separateurs visuels.
- **Transcription** : afficher dans un bloc scrollable avec une meilleure typographie, police mono legere, numeros de ligne ou horodatage si disponible
- **En-tete du detail** : carte recapitulative avec commercial, client, date, lieu, statut, duree — bien organisee en grille
- **Onglets** (Tabs) dans le dialog detail : "Resume" | "Transcription" | "Rapport" — au lieu de tout empiler verticalement
- Ajouter un badge "Duree de l'echange" si disponible

### Fichiers modifies
1. `src/pages/Dashboard.tsx` — filtre par periode + dialog detail avec onglets
2. `src/components/VisitRecorder.tsx` — interface discrete (panneau flottant, pas de dialog)
3. `src/pages/Visits.tsx` — bouton discret + dialog admin avec onglets structures

