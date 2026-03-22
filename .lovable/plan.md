

# Champ texte intégré dans le sélecteur "Autre"

## Modification

Refonte du composant `SelectWithOther` pour utiliser un **Popover + Command** (combobox) au lieu d'un Select + Input séparé. Quand l'utilisateur sélectionne "Autre", un champ de saisie apparaît **directement dans le menu déroulant**, pas en dessous.

### Comportement cible
1. L'utilisateur clique sur le sélecteur → un menu déroulant s'ouvre avec les options + "Autre"
2. S'il choisit une option prédéfinie → le menu se ferme, la valeur est sélectionnée
3. S'il choisit "Autre" → un champ texte apparaît **dans le même menu** pour saisir sa valeur personnalisée
4. Quand il valide (Entrée ou clic sur un bouton "Valider"), le menu se ferme et la valeur custom est utilisée

### Fichier modifié
- `src/components/SelectWithOther.tsx` : remplacement du pattern `Select` + `Input` par un `Popover` + liste d'options + input intégré

### Pas de changement nécessaire dans les pages
Les pages `Visits.tsx` et `Demands.tsx` utilisent déjà `SelectWithOther` avec la même interface (`options`, `value`, `onValueChange`). Seul le rendu interne change.

### Affichage des valeurs custom
Ajout d'un fallback dans `Visits.tsx` pour les statuts custom (lignes 270, 323, 381) : si le statut n'est pas dans `statusLabels`, afficher la valeur brute avec un badge gris neutre.

