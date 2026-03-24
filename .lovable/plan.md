

# Améliorer le rendu de la transcription et du résumé IA

## Problèmes identifiés

1. **Le prompt IA utilise du Markdown** (`**gras**`, `1.`, `- puces`) mais l'affichage est en `whitespace-pre-wrap` brut → les `**étoiles**` et le formatage Markdown apparaissent tels quels
2. **Le prompt génère un format rigide** (5 sections fixes) qui peut ne pas être pertinent si la transcription est courte ou informelle

## Solution

### 1. Améliorer le prompt IA (`supabase/functions/visit-summary/index.ts`)
- Demander au modèle de **ne pas utiliser de Markdown** (pas de `**`, `###`, etc.)
- Utiliser des tirets simples pour les listes, pas de mise en gras
- Rendre les sections optionnelles : ne les inclure que si pertinent
- Ajouter une instruction pour être plus naturel et contextuel

### 2. Rendre le Markdown dans l'affichage (`src/pages/Visits.tsx`)
- Installer `react-markdown` pour parser et afficher correctement le Markdown existant et futur
- Remplacer les `<div className="whitespace-pre-wrap">` par un composant `<ReactMarkdown>` stylisé pour les onglets Résumé et Rapport
- Garder `whitespace-pre-wrap font-mono` pour la transcription brute (qui n'est pas du Markdown)

### 3. Styles pour le Markdown rendu
- Titres (`h1-h3`) : taille et poids adaptés
- Listes (`ul`, `ol`) : puces et numérotation avec indentation
- Gras, italique : rendus correctement
- Paragraphes : espacement cohérent

### Fichiers modifiés
- `supabase/functions/visit-summary/index.ts` : prompt amélioré
- `src/pages/Visits.tsx` : rendu Markdown pour résumé et rapport

### Résultat
- Les résumés existants avec `**étoiles**` s'afficheront correctement en gras
- Les nouveaux résumés seront plus naturels et pertinents
- La transcription reste en format brut (texte mono)

