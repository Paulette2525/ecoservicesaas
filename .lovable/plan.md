

# Optimiser le chargement de la page Produits

## Problème

Deux problèmes majeurs :
1. **Limite Supabase** : la requête `select("*").order("name")` ne retourne que 1 000 lignes par défaut, donc 5 500+ produits sont invisibles
2. **Performance** : même si on augmentait la limite, charger et rendre 6 500 produits d'un coup est trop lent

## Solution : Pagination côté serveur + filtres côté serveur

### 1. Pagination serveur (50 produits par page)
- Ajouter un state `page` (défaut 0) et `totalCount`
- Utiliser `.range(page * 50, (page + 1) * 50 - 1)` sur la requête Supabase
- Utiliser `.select("*", { count: "exact" })` pour obtenir le nombre total
- Afficher des boutons Précédent / Suivant + numéro de page + total

### 2. Filtres côté serveur (au lieu de côté client)
- Appliquer `search` via `.or()` avec `ilike` sur name, reference, code_article
- Appliquer `categoryFilter` via `.eq("category", ...)` 
- Appliquer `supplierFilter` via `.eq("supplier", ...)`
- Réinitialiser la page à 0 quand un filtre change

### 3. Chargement des catégories/fournisseurs séparément
- Une requête distincte pour charger les listes de catégories et fournisseurs uniques (requête légère `select("category, supplier")` avec `limit(10000)`)
- Stocker ces listes indépendamment des produits paginés

### 4. État de chargement
- Ajouter un skeleton/spinner pendant le chargement de chaque page
- Debounce de 300ms sur la recherche textuelle pour éviter les requêtes à chaque frappe

### Fichier modifié
- `src/pages/Products.tsx` : refonte complète de la logique de données

### Résultat attendu
- Chargement initial < 1 seconde (50 produits au lieu de 6 500)
- Navigation fluide entre les pages
- Recherche et filtres instantanés côté serveur

