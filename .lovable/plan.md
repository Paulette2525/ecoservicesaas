

# Ajouter l'option "Autre" sur tous les sélecteurs de formulaire

## Périmètre

L'option "Autre" avec saisie libre s'applique aux **sélecteurs de formulaire** (pas aux filtres de recherche ni aux sélecteurs de client/produit qui pointent vers des enregistrements existants).

### Sélecteurs concernés

| Page | Champ | Options actuelles |
|------|-------|-------------------|
| **Visites** | Statut | Prise de contact, Opportunité, Commande probable |
| **Visites** | Profil rencontré | Directeur, Responsable achat, Technicien, Commercial, Magasinier |
| **Demandes** | Statut | Disponible, En rupture, En commande |

### Sélecteurs NON concernés (logique métier)
- **Filtres** (catégorie, fournisseur) : filtrent des données existantes
- **Client / Produit** : référencent des enregistrements en base
- **Rôle utilisateur** : contrôlé par l'admin, valeurs fixes

## Implémentation

### 1. Composant réutilisable `SelectWithOther`
Créer `src/components/SelectWithOther.tsx` :
- Affiche un `Select` classique avec toutes les options + "Autre" en dernier
- Quand "Autre" est sélectionné, affiche un `Input` en dessous pour saisir une valeur libre
- Expose `value` et `onValueChange` comme un Select normal
- La valeur retournée est soit une option prédéfinie, soit le texte saisi

### 2. Mise à jour des formulaires
- **Visits.tsx** : Remplacer les `Select` de statut et profil rencontré par `SelectWithOther`
- **Demands.tsx** : Remplacer le `Select` de statut par `SelectWithOther`

### 3. Base de données
Les colonnes `status` et `contact_role` de la table `visits` acceptent déjà du texte libre (type `text`). La colonne `status` de `client_demands` aussi. Pas de migration nécessaire — les valeurs personnalisées seront stockées telles quelles.

### 4. Affichage
Les labels custom (valeurs non prédéfinies) s'afficheront tels quels dans les tableaux et cartes, avec un style par défaut quand ils ne correspondent pas aux couleurs prédéfinies.

