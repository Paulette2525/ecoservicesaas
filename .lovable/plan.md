

# Ajouter la colonne "Commercial" sur la page Visites

## Modifications — `src/pages/Visits.tsx`

La page charge déjà les profils via `fetchProfiles()` et stocke le mapping `commercial_id → full_name` dans un state `profiles`. Il suffit d'ajouter l'affichage :

1. **Colonne "Commercial" dans le tableau** : ajouter une colonne entre "Statut" et "Notes" affichant `profiles.get(v.commercial_id)` pour chaque visite
2. **Mettre à jour le `colSpan`** de la ligne vide (aucune visite) pour refléter la nouvelle colonne
3. **Afficher le commercial dans le formulaire** : ajouter un champ en lecture seule (comme sur Clients) indiquant le commercial attribué — en édition : nom du commercial de la visite, en création : "Vous (automatique)"

Aucune modification de base de données nécessaire — `commercial_id` existe déjà sur `visits` et les profils sont déjà chargés.

