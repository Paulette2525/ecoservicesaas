

# Optimiser la page Clients + Recherche client sur les Visites

## Problème 1 : Page Clients lente

La page charge les 706 clients d'un coup avec `select("*").order("company_name")`. Avec la limite par défaut de 1 000 lignes, tout arrive mais le rendu de 700+ lignes dans le DOM est lent.

**Solution : Pagination serveur** (même approche que la page Produits)

### Fichier : `src/pages/Clients.tsx`
- Ajouter un state `page` (défaut 0), `pageSize` = 50, `totalCount`
- Remplacer la requête par `.select("*", { count: "exact" }).order("company_name").range(page * 50, (page + 1) * 50 - 1)`
- Appliquer les filtres de recherche côté serveur avec `.or("company_name.ilike.%search%, city.ilike.%search%, client_code.ilike.%search%, address.ilike.%search%")`
- Debounce de 300ms sur la recherche
- Ajouter des boutons Précédent / Suivant en bas du tableau
- Ajouter un skeleton de chargement pendant les requêtes
- Reset page à 0 quand la recherche change

## Problème 2 : Sélection client dans le formulaire Visites

Le `Select` avec 700+ `SelectItem` est lourd et inutilisable. L'utilisateur ne peut pas chercher.

**Solution : Combobox avec recherche** (Popover + Command)

### Fichier : `src/pages/Visits.tsx`
- Remplacer le `Select` client (lignes ~142-148) par un `Popover` + `Command` (composants déjà disponibles dans le projet)
- L'utilisateur tape le nom du client, seuls les 30 premiers résultats correspondants s'affichent
- Filtrage côté client parmi les `clientOptions` déjà chargés (700 éléments c'est OK en mémoire, juste pas OK en DOM)
- Même pattern que le combobox déjà utilisé sur la page Équivalences

### Résultat attendu
- Page Clients : chargement < 1s avec navigation par pages de 50
- Formulaire Visites : sélection client fluide avec recherche textuelle

