

# Optimiser la page Équivalences — Types et stock visible

## Objectif

Permettre au commercial de chercher un produit, voir immédiatement s'il est en rupture, et identifier le bon remplacement selon le type d'équivalence (strict, avec joint "E", sans joint, autre laboratoire).

## Modifications

### 1. Migration SQL — Ajouter le type d'équivalence

Ajouter une colonne `equivalence_type` à la table `product_equivalences` :

```sql
CREATE TYPE equivalence_type AS ENUM ('strict', 'avec_joint', 'sans_joint', 'autre_labo');
ALTER TABLE product_equivalences ADD COLUMN equivalence_type equivalence_type NOT NULL DEFAULT 'strict';
```

Les équivalences existantes seront marquées comme "strict" par défaut.

### 2. Refonte de la page (`src/pages/Equivalences.tsx`)

**Nouvelle UX : recherche par produit**
- En haut : un combobox unique "Rechercher un produit" (réutilise le composant existant)
- Quand un produit est sélectionné, afficher sa fiche résumée : référence, nom, fournisseur, **stock** (avec badge rouge si stock = 0)
- En dessous, afficher ses équivalents **groupés par type** dans cet ordre :
  1. **Strict** — même produit exact, badge vert
  2. **Avec joint (E)** — badge bleu
  3. **Sans joint** — badge gris
  4. **Autre laboratoire** — badge orange avec le nom du fournisseur
- Chaque équivalent affiche : référence, nom, fournisseur, **stock disponible** (vert si > 0, rouge si = 0)

**Formulaire d'ajout d'équivalence**
- Garder les 2 combobox Produit A / Produit B
- Ajouter un `Select` pour choisir le type : Strict, Avec joint (E), Sans joint, Autre laboratoire
- Le type est enregistré dans la nouvelle colonne

**Liste existante**
- Conserver la liste des équivalences en bas mais ajouter un badge coloré pour le type
- Filtrage par type en plus du filtre fournisseur existant

### 3. Chargement des données

Modifier la requête produits pour inclure `stock_available` :
```typescript
supabase.from("products").select("id, reference, name, supplier, stock_available")
```

Modifier la requête équivalences pour inclure `equivalence_type` :
```typescript
supabase.from("product_equivalences").select("*")
```

### Fichiers modifiés
- `supabase/migrations/` — nouvelle migration pour `equivalence_type`
- `src/pages/Equivalences.tsx` — refonte complète de la page

### Résultat attendu
Le commercial tape le nom d'un produit → voit son stock → voit immédiatement les alternatives classées par priorité (strict d'abord, puis variantes).

