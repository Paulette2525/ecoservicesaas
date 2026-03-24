

# Afficher l'adresse et le numéro client sur la page Clients

## Constat

Lors de l'import, l'adresse (ex: "BP: 12554 DOUALA") a été stockée dans le champ `notes`, et le numéro client (ex: "CL0001") n'a pas été importé du tout. Ces informations n'apparaissent donc pas dans le tableau.

## Plan

### 1. Migration SQL
- Ajouter 2 colonnes à la table `clients` : `address text` et `client_code text`
- Migrer les données existantes : copier `notes` → `address` (puisque les notes contiennent actuellement les adresses)
- Vider `notes` après la copie (ces données n'étaient pas des notes mais des adresses)

### 2. Réimporter les numéros clients depuis le fichier original
- Script Python : lire le fichier XLS, faire correspondre chaque `Intitulé` avec le `company_name` en base, et mettre à jour le `client_code` avec la valeur de `Numéro` (CL0001, CL0002, etc.)

### 3. Mettre à jour l'interface (`src/pages/Clients.tsx`)
- Ajouter `address` et `client_code` dans l'interface `Client`
- Afficher le code client et l'adresse dans le tableau desktop (nouvelles colonnes)
- Afficher ces infos dans les cartes mobile
- Ajouter les champs `address` et `client_code` dans le formulaire de création/édition

### Résultat
Le tableau affichera : Code | Entreprise | Adresse | Ville | Secteur | Téléphone | Email | Commercial

