

# 3 corrections : fournisseurs Produits + recherche produit Demandes + PDF sur demandes

## 1. Fournisseurs manquants sur la page Produits

**Problème** : La requête `select("category, supplier")` (ligne 69) est limitée à 1 000 lignes par défaut. Avec 6 500+ produits, beaucoup de fournisseurs sont invisibles.

**Solution** : Créer une fonction SQL `get_distinct_product_filters()` qui retourne les catégories et fournisseurs distincts directement, sans limite de lignes.

- Migration : `CREATE FUNCTION get_distinct_product_filters()` retournant les `DISTINCT category` et `DISTINCT supplier`
- `Products.tsx` : appeler `.rpc("get_distinct_product_filters")` au lieu du `select`

## 2. Recherche produit dans le formulaire Demandes

**Problème** : Le `Select` avec 6 500+ `SelectItem` est inutilisable.

**Solution** : Remplacer le `Select` produit par un Combobox (`Popover` + `Command`) avec recherche textuelle, identique au pattern déjà utilisé sur la page Équivalences.

- Charger les produits avec `id, reference, name, supplier`
- Filtrer côté client (top 50 résultats affichés)
- L'utilisateur tape une référence ou un nom pour trouver rapidement

## 3. Fichier PDF attaché aux demandes

**Migration SQL** :
- Ajouter une colonne `attachment_url text` à la table `client_demands`

**Storage** : Utiliser un nouveau bucket `demand-attachments` (privé) pour stocker les PDF.

**Formulaire Demandes** :
- Ajouter un champ `<input type="file" accept=".pdf">` dans le formulaire de création
- Upload le fichier vers le bucket, stocker l'URL dans `attachment_url`
- Afficher un lien/icône PDF sur chaque demande qui a un fichier attaché

### Fichiers modifiés
- `src/pages/Products.tsx` : remplacer la requête filtres par l'appel RPC
- `src/pages/Demands.tsx` : combobox produit + upload PDF + affichage lien PDF
- 1 migration SQL : fonction `get_distinct_product_filters` + colonne `attachment_url` + bucket storage

