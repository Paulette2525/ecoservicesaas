

# Tableau de bord admin : activités par commercial

## Objectif
Enrichir le Dashboard existant pour que les administrateurs et managers voient les performances de chaque commercial : nombre de visites, nombre de clients visités, dernières visites avec résumés/transcriptions.

## Ce qui sera ajouté au `Dashboard.tsx`

### 1. Section "Activité par commercial" (tableau)
- Requête jointe : `visits` groupé par `commercial_id`, avec jointure sur `profiles` pour le nom du commercial
- Colonnes : **Commercial** | **Nb visites** | **Clients visités (uniques)** | **Dernière visite**
- Calcul côté client après fetch de toutes les visites avec `commercial_id` et `client_id`

### 2. Section "Derniers rapports de visite" (liste/cards)
- Affiche les 10 dernières visites ayant une transcription ou un résumé
- Chaque carte montre : commercial, client, date, badge statut, extrait du résumé IA
- Clic pour ouvrir le détail complet (transcription + résumé) dans un Dialog

### 3. Données nécessaires (pas de migration)
- Fetch `visits` avec `select("*, clients(company_name)")` — déjà accessible
- Fetch `profiles` pour mapper `commercial_id` → nom — déjà accessible
- Tout est en lecture seule, les RLS existantes suffisent

### 4. Fichier modifié
- `src/pages/Dashboard.tsx` : ajout des deux sections sous le graphique existant, conditionnées au rôle admin/manager via `useAuth()`

