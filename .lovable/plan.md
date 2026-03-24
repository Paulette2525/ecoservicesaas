

# Importer la liste des clients ECO Services

## Analyse du fichier

Le fichier contient **~700 clients** avec 4 colonnes :
- **Numéro** (ex: CL0001) — code client interne
- **Intitulé** (ex: TOUT TRANSIT TRANSPORT) — nom de l'entreprise
- **Adresse** (ex: BP: 12554 DOUALA) — adresse postale
- **Ville** (ex: Douala) — souvent vide, parfois dans l'adresse

## Plan d'implémentation

### 1. Script d'import des données
- Lire le fichier XLS avec pandas
- Dédoublonner par Intitulé (quelques doublons possibles comme "CLIENT DIVERS")
- Mapping vers la table `clients` :
  - `Intitulé` → `company_name`
  - `Ville` → `city` (si vide, extraire la ville depuis l'adresse quand c'est évident : DOUALA, YAOUNDE, KRIBI, etc.)
  - `Adresse` → `notes` (stocker l'adresse complète dans les notes)
- Les champs `phone`, `email`, `sector` resteront vides (non présents dans le fichier)
- `commercial_id` sera null (pas d'attribution automatique)

### 2. Nettoyage des données
- Filtrer les entrées de type "CLIENT DIVERS", "test", noms de personnes isolées (ex: "EMMANUEL", "SERGE", "HAPPY") — les garder quand même car ce sont des clients réels de l'entreprise
- Normaliser les villes : "DLA" → "Douala", "YDE" → "Yaounde", "douala" → "Douala"

### 3. Aucune modification de schéma
La table `clients` a déjà toutes les colonnes nécessaires. Pas de migration requise.

### Résultat attendu
~700 clients importés, consultables et éditables sur la page Clients.

