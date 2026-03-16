

# Supprimer toutes les visites et clients

## Données actuelles
- 7 visites
- 2 clients
- 0 produits de visite
- 0 demandes clients

## Ce que je vais faire

Supprimer dans l'ordre (pour respecter les dépendances) :
1. `visit_products` (liés aux visites)
2. `visits` (liés aux clients)
3. `client_demands` (liés aux clients)
4. `clients`

Les fichiers audio dans le bucket `visit-recordings` seront aussi nettoyés si présents.

Aucune modification de code nécessaire — uniquement suppression de données en base.

