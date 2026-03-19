

# Importer 4 nouveaux catalogues fournisseurs

## Analyse des fichiers

Les 4 fichiers ont **exactement la même structure** que TRANSLINK (Code article, Référence, Désignation, PU Vente HT, PU Vente TTC, Stock réel, Fournisseur principal).

| Fichier | Fournisseur | Lignes brutes | Types de produits |
|---------|------------|---------------|-------------------|
| flexible_bjflex.xls | BJFLEX | ~10 000 | Flexibles hydrauliques (R15, 2SC, 4SP, 4SH, raccords, embouts) |
| synflex.xls | SYNFLEX | ~46 | Câbles, gaines, cales, plaques à bornes |
| conti_courroies.xls | CONTITECH | ~2 669 | Courroies (XPA, XPB, XPZ, SPZ, SPA, SPB) |
| export_NTN_SNR.xls | NTN-SNR | ~5 401 | Roulements, bagues, joints, paliers |

Chaque fichier contient des **lignes dupliquées** par référence (stocks différents par lot) — les stocks seront additionnés comme pour TRANSLINK.

## Plan d'implémentation

### 1. Script d'import des données
Pour chaque fichier :
- Lire le fichier XLS avec pandas
- Dédoublonner par référence (somme des stocks, garder le prix)
- Extraire automatiquement les catégories depuis les désignations
- Insérer dans la table `products` existante (mêmes colonnes : reference, name, category, code_article, price_ht, price_ttc, stock_available, supplier)

### 2. Catégories attendues par fournisseur
- **BJFLEX** : Flexible R15, Flexible 2SC, Flexible 4SP, Flexible 4SH, Raccord, Embout, Adaptateur...
- **SYNFLEX** : Câble, Gaine, Cale, Plaque à bornes, Ruban, Vernis
- **CONTITECH** : Courroie XPA, Courroie XPB, Courroie XPZ, Courroie SPZ, Courroie SPA...
- **NTN-SNR** : Roulement, Bague, Joint, Palier, Butée, Rotule...

### 3. Aucune modification de code nécessaire
La page Produits et le formulaire supportent déjà tous les champs (prix, fournisseur, code article, catégorie, filtre). Il suffit d'insérer les données.

### Estimation
~1 000+ produits uniques ajoutés aux 184 TRANSLINK existants.

