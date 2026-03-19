

# Filtre fournisseur + Optimisation page Équivalences

## 1. Page Produits — Ajout filtre fournisseur

**Fichier :** `src/pages/Products.tsx`

- Ajouter un state `supplierFilter` (défaut `"all"`)
- Extraire la liste des fournisseurs uniques depuis les produits (comme pour les catégories)
- Ajouter un 2e `Select` à côté du filtre catégorie avec les options : Tous, BJFLEX, CONTITECH, NTN-SNR, SYNFLEX, TRANSLINK
- Ajouter la condition `matchSupplier` dans le filtre `filtered`

## 2. Page Équivalences — Optimisation complète

Le problème actuel : avec 6 500+ produits, les deux `Select` rendent 6 500 `SelectItem` chacun, ce qui est inutilisable. De plus, il n'y a aucun moyen de filtrer ou chercher.

**Refonte de `src/pages/Equivalences.tsx` :**

- **Recherche avec autocomplétion** : Remplacer les `Select` par des champs `Input` avec recherche textuelle (type-ahead). L'utilisateur tape une référence ou un nom, et une liste filtrée apparaît (via `Command`/`Combobox` pattern)
- **Afficher le fournisseur** : Inclure `supplier` dans les données produit chargées, et l'afficher dans les résultats de recherche et dans les équivalences existantes (Badge fournisseur)
- **Filtre par fournisseur** : Ajouter un filtre fournisseur sur les équivalences existantes pour retrouver facilement les correspondances par marque
- **Recherche dans les équivalences** : Ajouter un champ de recherche pour filtrer les équivalences existantes par référence ou nom
- **Pagination/limite** : Ne charger que `id, reference, name, supplier` pour les produits, et limiter la requête ou paginer les résultats

### Composant Combobox (sélection produit)
Utilisation du pattern `Popover` + `Command` (déjà disponible dans le projet via `@/components/ui/command`) pour créer un sélecteur de produit avec recherche intégrée. La recherche filtre côté client parmi les produits chargés.

### Technical details

```text
Products.tsx:
  + supplierFilter state
  + suppliers = [...new Set(products.map(p => p.supplier).filter(Boolean))]
  + Select component for supplier
  + matchSupplier condition in filter

Equivalences.tsx:
  - Replace Select with Popover+Command combobox
  - Product interface: add supplier field
  - Add search + supplier filter on existing equivalences
  - Show supplier Badge on each equivalence row
```

