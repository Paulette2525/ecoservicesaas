

# Importer le catalogue produits TRANSLINK

## Analyse du fichier

Le fichier contient **~170 produits uniques** (après dédoublonnage) avec les colonnes :
- **Code article** (ex: 8500161)
- **Référence** (ex: E06B2) — servira de `reference`
- **Désignation** (ex: ATTACHE RAPIDE DOUBLE E06B2) — servira de `name`
- **PU. Vente HT** — prix hors taxes
- **PU. Vente TTC** — prix toutes taxes comprises
- **Stock réel** — stock disponible
- **Fournisseur principal** — toujours TRANSLINK

Il y a des **lignes dupliquées** (même référence avec des stocks différents) — les stocks seront additionnés.

### Catégories détectées automatiquement
- Attache rapide simple / double
- Chaîne simple / double
- Maillon coudé simple / double
- Pignon simple / double / triple trempé
- Sonde thermique

### Données manquantes
Le fichier ne contient **pas d'équivalences produits**. Il faudra que l'entreprise fournisse un fichier séparé avec les correspondances (ex: 6205-2RS = 6205DDU = 6205LLU).

## Plan d'implémentation

### 1. Migration base de données
Ajouter les colonnes manquantes à la table `products` :
- `price_ht` (numeric, nullable) — prix unitaire HT
- `price_ttc` (numeric, nullable) — prix unitaire TTC
- `supplier` (text, nullable) — fournisseur principal
- `code_article` (text, nullable) — code article interne

### 2. Import des données
Script d'insertion des ~170 produits uniques depuis le fichier :
- Dédoublonnage par référence (somme des stocks pour les doublons)
- Extraction automatique de la catégorie depuis la désignation
- Mapping : référence → `reference`, désignation → `name`, stock réel → `stock_available`

### 3. Mise à jour de l'interface Products
- Afficher les colonnes **Prix HT**, **Prix TTC** dans le tableau desktop
- Afficher les prix dans les cartes mobiles
- Ajouter les champs prix et fournisseur dans le formulaire d'édition
- Permettre le tri/filtre par catégorie

### 4. Équivalences (en attente)
L'entreprise devra fournir la liste des équivalences séparément pour alimenter la table `product_equivalences`.

## Résumé pour l'entreprise

L'application utilisera ces données pour :
- **Catalogue produits** : consultation du stock, prix, catégories par tous les commerciaux
- **Visites** : lors d'une visite, le commercial pourra associer des produits du catalogue à la visite
- **Demandes clients** : créer des demandes liées aux produits avec stock en temps réel
- **Équivalences** (à venir) : quand un client utilise un nom alternatif pour un produit, l'IA et les commerciaux pourront retrouver le bon produit

