

# Afficher le commercial attribué sur la page Clients

## Constat
La table `clients` possède déjà une colonne `commercial_id` qui stocke l'ID du commercial ayant enregistré le client. Cependant, la page Clients n'affiche pas cette information.

## Modifications — `src/pages/Clients.tsx`

1. **Charger les profils** : ajouter une requete sur `profiles` pour obtenir le mapping `user_id → full_name`
2. **Ajouter une colonne "Commercial"** dans le tableau, entre "Email" et le bouton d'edition, affichant le nom du commercial (`profiles.full_name`) associe au `commercial_id` du client
3. **Afficher le commercial dans le formulaire** (en lecture seule) : lors de l'edition, montrer le nom du commercial qui a cree le client ; lors de la creation, indiquer que le commercial connecte sera automatiquement attribue

Aucune modification de base de donnees necessaire — le champ `commercial_id` existe deja et est rempli a la creation.

